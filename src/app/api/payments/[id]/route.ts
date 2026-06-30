import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: any = {};
  if (body.status !== undefined) {
    data.status = body.status;
    data.paidAt = body.status === "PAID" ? new Date() : null;
  }
  if (body.amount !== undefined) data.amount = Number(body.amount);
  if (body.notes !== undefined) data.notes = body.notes;

  const payment = await prisma.payment.update({ where: { id: params.id }, data });
  return NextResponse.json(payment);
}
