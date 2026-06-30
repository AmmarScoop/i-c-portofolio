import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [totalChildren, activeEnrollments, unpaidLevels, completedPortfolioItems, totalCourses, totalBadgesAwarded] =
    await Promise.all([
      prisma.child.count(),
      prisma.enrollment.count({ where: { status: "ACTIVE" } }),
      prisma.payment.count({ where: { status: { in: ["UNPAID", "PARTIAL"] } } }),
      prisma.portfolioItem.count({ where: { isActive: true } }),
      prisma.course.count({ where: { isActive: true } }),
      prisma.childBadge.count(),
    ]);

  return NextResponse.json({
    totalChildren,
    activeEnrollments,
    unpaidLevels,
    completedPortfolioItems,
    totalCourses,
    totalBadgesAwarded,
  });
}
