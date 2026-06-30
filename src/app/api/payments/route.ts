import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { paymentSchema } from "@/lib/zod-schemas";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payments = await prisma.payment.findMany({
    include: { child: true, level: { include: { course: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(payments);
}

// Creates or updates the payment record for a given child+level (unique pair).
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { childId, levelId, ...rest } = parsed.data;
  const payment = await prisma.payment.upsert({
    where: { childId_levelId: { childId, levelId } },
    update: {
      ...rest,
      paidAt: rest.status === "PAID" ? new Date(rest.paidAt ?? Date.now()) : rest.paidAt ? new Date(rest.paidAt) : null,
    },
    create: {
      childId,
      levelId,
      enrollmentId: parsed.data.enrollmentId,
      amount: parsed.data.amount,
      status: parsed.data.status,
      notes: parsed.data.notes ?? undefined,
      paidAt: parsed.data.status === "PAID" ? new Date(parsed.data.paidAt ?? Date.now()) : null,
    },
  });
  return NextResponse.json(payment, { status: 201 });
}
