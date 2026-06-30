import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getAuthSession } from "@/lib/auth";
import { childSchema } from "@/lib/zod-schemas";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const childId = (session.user as any).childId;
  // Children may only fetch their own record; admins may fetch any.
  if (role !== "ADMIN" && childId !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const child = await prisma.child.findUnique({
    where: { id: params.id },
    include: {
      enrollments: { include: { course: true, currentLevel: { include: { sessions: true } } } },
      attendances: { include: { session: { include: { level: true } } }, orderBy: { attendedAt: "desc" } },
      portfolioItems: { where: { isActive: true }, include: { session: true, level: true, course: true }, orderBy: { createdAt: "desc" } },
      payments: { include: { level: { include: { course: true } } } },
      childBadges: { include: { badge: true }, orderBy: { awardedAt: "desc" } },
    },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(child);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = childSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: any = { ...parsed.data };
  if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
  if (data.parentEmail === "") data.parentEmail = null;

  const child = await prisma.child.update({ where: { id: params.id }, data });
  return NextResponse.json(child);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.child.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
