import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseChildImportFile } from "@/lib/excel";
import { syncPortfolioForAttendance } from "@/lib/portfolio";
import { evaluateBadgesForChild } from "@/lib/badges";

/**
 * Two-phase import:
 *  - mode=preview (default): parse + validate, return per-row results, write nothing.
 *  - mode=commit: re-validate and actually create the valid rows. Duplicate
 *    children (same fullName + parentPhone) are skipped and reported, never
 *    overwritten, per the "prevent duplicate children" requirement.
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const mode = (form.get("mode") as string) || "preview";
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const rows = parseChildImportFile(buffer);

  // Flag duplicates against existing DB records (in addition to per-row zod validation).
  const existing = await prisma.child.findMany({ select: { fullName: true, parentPhone: true } });
  const existingKeys = new Set(existing.map((c) => `${c.fullName.toLowerCase()}|${c.parentPhone}`));

  // Load all courses once so each row's courseName/levelNumber/sessionNumber
  // can be resolved and validated (and later used to enroll + back-fill
  // attendance on commit).
  const courses = await prisma.course.findMany({
    include: {
      levels: {
        include: { sessions: { orderBy: { sessionNumber: "asc" } } },
        orderBy: { levelNumber: "asc" },
      },
    },
  });

  type Placement = { courseId: string; levelId: string; priorSessionIds: string[] };
  const placements = new Map<number, Placement>(); // rowNumber -> resolved placement

  const seenInFile = new Set<string>();
  const annotated = rows.map((row) => {
    if (!row.valid) return row;
    const key = `${String(row.data.fullName).toLowerCase()}|${row.data.parentPhone}`;
    const isDuplicate = existingKeys.has(key) || seenInFile.has(key);
    seenInFile.add(key);
    if (isDuplicate) {
      return { ...row, valid: false, errors: [...row.errors, "Duplicate child (same name + parent phone)"] };
    }

    // Resolve the optional enrollment position.
    const courseName = String(row.data.courseName ?? "").trim();
    if (courseName) {
      const course = courses.find((c) => c.name.trim().toLowerCase() === courseName.toLowerCase());
      if (!course) {
        return { ...row, valid: false, errors: [...row.errors, `Course "${courseName}" not found`] };
      }
      const levelNumber = Number(row.data.levelNumber ?? 1) || 1;
      const sessionNumber = Number(row.data.sessionNumber ?? 1) || 1;
      const level = course.levels.find((l) => l.levelNumber === levelNumber);
      if (!level) {
        return { ...row, valid: false, errors: [...row.errors, `Level ${levelNumber} not found in course "${course.name}"`] };
      }
      // Every session strictly BEFORE (levelNumber, sessionNumber) gets
      // auto-attendance: all sessions of earlier levels, plus earlier
      // sessions of the target level.
      const priorSessionIds = course.levels.flatMap((l) =>
        l.levelNumber < levelNumber
          ? l.sessions.map((s) => s.id)
          : l.levelNumber === levelNumber
            ? l.sessions.filter((s) => s.sessionNumber < sessionNumber).map((s) => s.id)
            : []
      );
      placements.set(row.rowNumber, { courseId: course.id, levelId: level.id, priorSessionIds });
    }
    return row;
  });

  if (mode === "preview") {
    return NextResponse.json({
      total: annotated.length,
      validCount: annotated.filter((r) => r.valid).length,
      invalidCount: annotated.filter((r) => !r.valid).length,
      rows: annotated,
    });
  }

  // mode=commit
  const validRows = annotated.filter((r) => r.valid);
  let created = 0;
  const failedRows: { rowNumber: number; error: string }[] = [];
  for (const row of validRows) {
    const d = row.data as any;
    // Guard against unparseable dates so one bad cell can't 500 the request.
    const dob = d.dateOfBirth ? new Date(d.dateOfBirth) : null;
    try {
      const child = await prisma.child.create({
        data: {
          fullName: d.fullName,
          parentName: d.parentName,
          parentPhone: d.parentPhone,
          parentEmail: d.parentEmail || null,
          age: Number(d.age),
          dateOfBirth: dob && !isNaN(dob.getTime()) ? dob : null,
          emergencyContactName: d.emergencyContactName || null,
          emergencyContactPhone: d.emergencyContactPhone || null,
          schoolName: d.schoolName || null,
          preferredTrack: d.preferredTrack || null,
          skillLevel: d.skillLevel || null,
          notes: d.notes || null,
        },
      });
      created++;

      // Optional enrollment + attendance back-fill (validated during annotation).
      const placement = placements.get(row.rowNumber);
      if (placement) {
        const enrollment = await prisma.enrollment.create({
          data: {
            childId: child.id,
            courseId: placement.courseId,
            currentLevelId: placement.levelId,
            status: "ACTIVE",
          },
        });
        for (const sessionId of placement.priorSessionIds) {
          await prisma.attendance.upsert({
            where: { childId_sessionId: { childId: child.id, sessionId } },
            update: { status: "PRESENT" },
            create: {
              childId: child.id,
              sessionId,
              enrollmentId: enrollment.id,
              status: "PRESENT",
              notes: "Auto-marked by Excel import (joined at a later session)",
            },
          });
          // Same side effects as marking PRESENT in the Attendance screen:
          // portfolio items are created per session product.
          await syncPortfolioForAttendance({
            childId: child.id,
            enrollmentId: enrollment.id,
            sessionId,
            status: "PRESENT",
          });
        }
        if (placement.priorSessionIds.length > 0) {
          await evaluateBadgesForChild(child.id);
        }
      }
    } catch (err: any) {
      failedRows.push({ rowNumber: row.rowNumber, error: err?.message?.split("\n").pop() ?? "Unknown error" });
    }
  }

  return NextResponse.json({
    importedCount: created,
    skippedCount: annotated.length - validRows.length,
    failedRows,
    rows: annotated,
  });
}
