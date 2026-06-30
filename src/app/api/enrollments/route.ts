import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { enrollmentSchema } from "@/lib/zod-schemas";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollments = await prisma.enrollment.findMany({
    include: { child: true, course: true, currentLevel: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(enrollments);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = enrollmentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Default to the course's first level if none specified.
  let currentLevelId = parsed.data.currentLevelId;
  if (!currentLevelId) {
    const firstLevel = await prisma.courseLevel.findFirst({
      where: { courseId: parsed.data.courseId },
      orderBy: { levelNumber: "asc" },
    });
    currentLevelId = firstLevel?.id ?? null;
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      childId: parsed.data.childId,
      courseId: parsed.data.courseId,
      currentLevelId,
      status: parsed.data.status ?? "ACTIVE",
    },
  });
  return NextResponse.json(enrollment, { status: 201 });
}
