import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { badgeSchema } from "@/lib/zod-schemas";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const badges = await prisma.badge.findMany({
    include: { _count: { select: { childBadges: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(badges);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = badgeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const badge = await prisma.badge.create({ data: parsed.data });
  return NextResponse.json(badge, { status: 201 });
}
