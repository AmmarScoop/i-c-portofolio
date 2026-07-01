import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/shared/product-image";
import { Users, ClipboardList, Wallet, Sparkles, BookOpen, Award } from "lucide-react";
import { formatDate } from "@/lib/utils";

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
    { label: "Total Children", labelAr: "إجمالي الأطفال", value: totalChildren, icon: Users, color: "bg-blue-500/10 text-blue-600", bar: "bg-blue-500" },
    { label: "Active Enrollments", labelAr: "تسجيلات نشطة", value: activeEnrollments, icon: ClipboardList, color: "bg-purple-500/10 text-purple-600", bar: "bg-purple-500" },
    { label: "Unpaid / Partial Levels", labelAr: "مستويات غير مدفوعة", value: unpaidLevels, icon: Wallet, color: "bg-amber-500/10 text-amber-600", bar: "bg-amber-500" },
    { label: "Portfolio Items", labelAr: "عناصر المحفظة", value: completedPortfolioItems, icon: Sparkles, color: "bg-green-500/10 text-green-600", bar: "bg-green-500" },
    { label: "Active Courses", labelAr: "الدورات النشطة", value: totalCourses, icon: BookOpen, color: "bg-teal-500/10 text-teal-600", bar: "bg-teal-500" },
    { label: "Badges Awarded", labelAr: "الأوسمة الممنوحة", value: totalBadgesAwarded, icon: Award, color: "bg-pink-500/10 text-pink-600", bar: "bg-pink-500" },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl kid-gradient-1 text-white p-6 relative overflow-hidden">
        <div className="dot-grid absolute inset-0 opacity-60" />
        <div className="relative">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-white/70">Overview of the academy&apos;s children, courses, and progress.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className={`h-1 ${c.bar}`} />
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${c.color}`}>
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
              {recentPortfolio.map((p, i) => (
                <div key={p.id} className="rounded-xl border overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-20 w-full">
                    <ProductImage src={p.mediaUrl} alt={p.title} outputType={p.type} className="h-20 w-full" gradientIndex={i} />
                  </div>
                  <div className="p-3 flex flex-col gap-1">
                    <div className="font-medium text-sm truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.child.fullName} · {p.course.name}</div>
                    <Badge variant="outline" className="w-fit text-[10px]">{formatDate(p.createdAt)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
