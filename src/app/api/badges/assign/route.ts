import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { assignBadgeSchema } from "@/lib/zod-schemas";

// Manual badge assignment by an admin (works for any badge, including MANUAL-trigger ones).
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = assignBadgeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.childBadge.findUnique({
    where: { childId_badgeId: { childId: parsed.data.childId, badgeId: parsed.data.badgeId } },
  });
  if (existing) return NextResponse.json({ error: "Child already has this badge" }, { status: 409 });

  const adminName = (session.user as any).name ?? "admin";
  const childBadge = await prisma.childBadge.create({
    data: { ...parsed.data, awardedBy: adminName },
  });
  return NextResponse.json(childBadge, { status: 201 });
}
