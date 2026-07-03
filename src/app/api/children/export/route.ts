import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildChildrenExportWorkbook, type ChildExportRow } from "@/lib/excel";
import { formatDate } from "@/lib/utils";

/**
 * POST /api/children/export
 * Bulk-action endpoint for /admin/children: exports the selected children
 * (by id) to an .xlsx file. If `ids` is omitted/empty, exports every child
 * (used by a future "export all" action, not currently wired up in the UI).
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;

  const children = await prisma.child.findMany({
    where: ids && ids.length > 0 ? { id: { in: ids } } : undefined,
    include: {
      enrollments: { include: { course: true } },
      payments: true,
      user: true,
    },
    orderBy: { fullName: "asc" },
  });

  if (children.length === 0) {
    return NextResponse.json({ error: "No children to export" }, { status: 400 });
  }

  const rows: ChildExportRow[] = children.map((c) => {
    const unpaidCount = c.payments.filter((p) => p.status !== "PAID").length;
    const paymentStatus = c.payments.length === 0 ? "NO PAYMENT RECORDS" : unpaidCount === 0 ? "PAID" : `${unpaidCount} UNPAID/PARTIAL LEVEL(S)`;
    return {
      fullName: c.fullName,
      parentName: c.parentName,
      parentPhone: c.parentPhone,
      parentEmail: c.parentEmail ?? "",
      age: c.age,
      dateOfBirth: c.dateOfBirth ? formatDate(c.dateOfBirth) : "",
      emergencyContactName: c.emergencyContactName ?? "",
      emergencyContactPhone: c.emergencyContactPhone ?? "",
      schoolName: c.schoolName ?? "",
      preferredTrack: c.preferredTrack ?? "",
      skillLevel: c.skillLevel ?? "",
      courses: c.enrollments.map((e) => e.course.name).join(", "),
      enrollmentStatus: c.enrollments.map((e) => e.status).join(", "),
      paymentStatus,
      loginEmail: c.user?.email ?? "NO LOGIN",
      loginPassword: c.user ? (c.user.initialPassword ?? "(set before tracking — reset login to see it)") : "",
      notes: c.notes ?? "",
    };
  });

  const buffer = buildChildrenExportWorkbook(rows);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="children_export_${Date.now()}.xlsx"`,
    },
  });
}
