import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { childSchema } from "@/lib/zod-schemas";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const children = await prisma.child.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q } },
            { parentName: { contains: q } },
            { parentPhone: { contains: q } },
          ],
        }
      : undefined,
    include: {
      enrollments: { include: { course: true, currentLevel: true } },
      childBadges: true,
      _count: { select: { portfolioItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(children);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = childSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Prevent duplicates using parentPhone + fullName, same rule as bulk import.
  const dup = await prisma.child.findFirst({
    where: { fullName: parsed.data.fullName, parentPhone: parsed.data.parentPhone },
  });
  if (dup) return NextResponse.json({ error: "A child with this name and parent phone already exists" }, { status: 409 });

  const child = await prisma.child.create({
    data: {
      ...parsed.data,
      parentEmail: parsed.data.parentEmail || null,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
    },
  });
  return NextResponse.json(child, { status: 201 });
}
