import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { evaluateBadgesForChild } from "@/lib/badges";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: any = {};
  if (body.currentLevelId !== undefined) data.currentLevelId = body.currentLevelId;
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "COMPLETED") data.completedAt = new Date();
  }

  const enrollment = await prisma.enrollment.update({ where: { id: params.id }, data });

  if (body.status === "COMPLETED") {
    await evaluateBadgesForChild(enrollment.childId);
  }

  return NextResponse.json(enrollment);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.enrollment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
