import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { attendanceSaveSchema } from "@/lib/zod-schemas";
import { syncPortfolioForAttendance } from "@/lib/portfolio";
import { evaluateBadgesForChild } from "@/lib/badges";

/**
 * GET /api/attendance?levelId=...&sessionId=...
 * Returns the roster (active enrollments) for a level, along with any existing
 * attendance already recorded for the chosen session, so the admin UI can
 * pre-fill the form.
 */
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const levelId = req.nextUrl.searchParams.get("levelId");
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!levelId) return NextResponse.json({ error: "levelId is required" }, { status: 400 });

  const enrollments = await prisma.enrollment.findMany({
    where: { currentLevelId: levelId, status: "ACTIVE" },
    include: { child: true },
    orderBy: { child: { fullName: "asc" } },
  });

  const existingAttendance = sessionId
    ? await prisma.attendance.findMany({ where: { sessionId } })
    : [];

  return NextResponse.json({ enrollments, existingAttendance });
}

/**
 * POST /api/attendance
 * Saves attendance for a whole session roster in one batch, then for every
 * record: (1) syncs the auto-generated portfolio item, and (2) re-evaluates
 * badge rules for that child. See src/lib/portfolio.ts and src/lib/badges.ts
 * for the detailed rules.
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = attendanceSaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sessionId, entries } = parsed.data;
  const results = [];

  for (const entry of entries) {
    // Upsert on the unique (childId, sessionId) pair: editing attendance for the
    // same child/session updates the existing row instead of duplicating it.
    const attendance = await prisma.attendance.upsert({
      where: { childId_sessionId: { childId: entry.childId, sessionId } },
      update: { status: entry.status, notes: entry.notes ?? undefined, attendedAt: new Date() },
      create: {
        childId: entry.childId,
        sessionId,
        enrollmentId: entry.enrollmentId,
        status: entry.status,
        notes: entry.notes ?? undefined,
      },
    });

    await syncPortfolioForAttendance({
      childId: entry.childId,
      enrollmentId: entry.enrollmentId,
      sessionId,
      status: entry.status,
    });

    const newBadges = await evaluateBadgesForChild(entry.childId);
    results.push({ childId: entry.childId, attendanceId: attendance.id, newBadges });
  }

  return NextResponse.json({ saved: results.length, results });
}
