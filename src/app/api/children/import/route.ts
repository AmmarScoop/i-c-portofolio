import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseChildImportFile } from "@/lib/excel";

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

  const seenInFile = new Set<string>();
  const annotated = rows.map((row) => {
    if (!row.valid) return row;
    const key = `${String(row.data.fullName).toLowerCase()}|${row.data.parentPhone}`;
    const isDuplicate = existingKeys.has(key) || seenInFile.has(key);
    seenInFile.add(key);
    if (isDuplicate) {
      return { ...row, valid: false, errors: [...row.errors, "Duplicate child (same name + parent phone)"] };
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
  for (const row of validRows) {
    const d = row.data as any;
    await prisma.child.create({
      data: {
        fullName: d.fullName,
        parentName: d.parentName,
        parentPhone: d.parentPhone,
        parentEmail: d.parentEmail || null,
        age: Number(d.age),
        dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
        emergencyContactName: d.emergencyContactName || null,
        emergencyContactPhone: d.emergencyContactPhone || null,
        schoolName: d.schoolName || null,
        preferredTrack: d.preferredTrack || null,
        skillLevel: d.skillLevel || null,
        notes: d.notes || null,
      },
    });
    created++;
  }

  return NextResponse.json({
    importedCount: created,
    skippedCount: annotated.length - validRows.length,
    rows: annotated,
  });
}
