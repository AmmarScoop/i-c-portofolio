import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildChildImportTemplate } from "@/lib/excel";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const buffer = buildChildImportTemplate();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="children_import_template.xlsx"',
    },
  });
}
