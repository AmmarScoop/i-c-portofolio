import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardList, Wallet, Sparkles, BookOpen, Award } from "lucide-react";
import { formatDate, OUTPUT_TYPE_LABELS } from "@/lib/utils";

export default async function AdminDashboard() {
  const [totalChildren, activeEnrollments, unpaidLevels, completedPortfolioItems, totalCourses, totalBadgesAwarded, recentPortfolio] =
    await Promise.all([
      prisma.child.count(),
      prisma.enrollment.count({ where: { status: "ACTIVE" } }),
      prisma.payment.count({ where: { status: { in: ["UNPAID", "PARTIAL"] } } }),
      prisma.portfolioItem.count({ where: { isActive: true } }),
      prisma.course.count({ where: { isActive: true } }),
      prisma.childBadge.count(),
      prisma.portfolioItem.findMany({
        where: { isActive: true },
        include: { child: true, course: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  const cards = [
    { label: "Total Children", labelAr: "إجمالي الأطفال", value: totalChildren, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Active Enrollments", labelAr: "تسجيلات نشطة", value: activeEnrollments, icon: ClipboardList, color: "bg-purple-50 text-purple-600" },
    { label: "Unpaid / Partial Levels", labelAr: "مستويات غير مدفوعة", value: unpaidLevels, icon: Wallet, color: "bg-amber-50 text-amber-600" },
    { label: "Portfolio Items", labelAr: "عناصر المحفظة", value: completedPortfolioItems, icon: Sparkles, color: "bg-green-50 text-green-600" },
    { label: "Active Courses", labelAr: "الدورات النشطة", value: totalCourses, icon: BookOpen, color: "bg-teal-50 text-teal-600" },
    { label: "Badges Awarded", labelAr: "الأوسمة الممنوحة", value: totalBadgesAwarded, icon: Award, color: "bg-pink-50 text-pink-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of the academy's children, courses, and progress.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${c.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{c.value}</div>
                  <div className="text-sm text-muted-foreground">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.labelAr}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently Created Portfolio Items</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPortfolio.length === 0 ? (
            <p className="text-sm text-muted-foreground">No portfolio items yet. Mark attendance as PRESENT to auto-generate items.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentPortfolio.map((p) => (
                <div key={p.id} className="rounded-lg border p-3 flex flex-col gap-1">
                  <div className="text-2xl">{OUTPUT_TYPE_LABELS[p.type]?.emoji}</div>
                  <div className="font-medium text-sm">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.child.fullName} · {p.course.name}</div>
                  <Badge variant="outline" className="w-fit text-[10px]">{formatDate(p.createdAt)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
