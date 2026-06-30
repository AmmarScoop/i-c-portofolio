import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireChild } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/shared/product-image";
import { TRACK_LABELS } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export default async function ChildDashboard() {
  const session = await requireChild();
  if (!session) redirect("/login");
  const childId = (session.user as any).childId as string;

  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: { course: true, currentLevel: { include: { sessions: { orderBy: { sessionNumber: "asc" } } } } },
      },
      attendances: { where: { status: "PRESENT" }, select: { sessionId: true } },
      portfolioItems: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 4 },
      childBadges: { include: { badge: true }, orderBy: { awardedAt: "desc" }, take: 4 },
    },
  });
  if (!child) redirect("/login");

  const presentSessionIds = new Set(child.attendances.map((a) => a.sessionId));

  return (
    <div className="space-y-8 py-6">
      <div className="kid-gradient-1 rounded-2xl text-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold">Hi {child.fullName}! 👋</h1>
        <p className="opacity-90">Welcome back to your learning adventure!</p>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">🎯 My Courses</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {child.enrollments.map((e) => {
            const sessions = e.currentLevel?.sessions ?? [];
            const totalSessions = sessions.length;
            const completed = sessions.filter((s) => presentSessionIds.has(s.id)).length;
            const pct = totalSessions ? Math.round((completed / totalSessions) * 100) : 0;
            // "Up next": the first session in the current level the child hasn't
            // attended yet — shown with its product photo as a sneak peek of
            // what they're about to build, to make the next class exciting.
            const nextSession = sessions.find((s) => !presentSessionIds.has(s.id));

            return (
              <Card key={e.id} className="overflow-hidden border-0 shadow-md rounded-2xl">
                <div className={e.course.track === "ROBOTICS" ? "kid-gradient-2 h-2" : "kid-gradient-3 h-2"} />
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold">{e.course.name}</div>
                    <Badge variant="secondary">{TRACK_LABELS[e.course.track].en}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">Current level: {e.currentLevel?.name ?? "—"}</div>
                  <Progress value={pct} />
                  <div className="text-xs text-muted-foreground">{completed} / {totalSessions} sessions completed ({pct}%)</div>

                  {nextSession ? (
                    <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-2">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                        <ProductImage
                          src={nextSession.productImageUrl}
                          alt={nextSession.productImageAlt}
                          outputType={nextSession.outputType}
                          className="h-14 w-14"
                          gradientIndex={1}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-primary flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Coming up / قادم
                        </div>
                        <div className="text-sm font-medium truncate">{nextSession.outputName}</div>
                      </div>
                    </div>
                  ) : totalSessions > 0 ? (
                    <div className="rounded-xl bg-green-50 text-green-700 text-xs font-medium p-2 text-center">
                      🎉 You finished every session in this level!
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
          {child.enrollments.length === 0 && <p className="text-muted-foreground">No active courses yet. Ask your teacher to enroll you!</p>}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">✨ Latest Creations</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {child.portfolioItems.map((p, i) => (
            <Card key={p.id} className="text-center border-0 shadow-md overflow-hidden rounded-2xl">
              <div className="h-20 w-full">
                <ProductImage src={p.mediaUrl} alt={p.title} outputType={p.type} className="h-20 w-full" gradientIndex={i} />
              </div>
              <CardContent className="p-3">
                <div className="text-sm font-semibold truncate">{p.title}</div>
              </CardContent>
            </Card>
          ))}
          {child.portfolioItems.length === 0 && <p className="text-muted-foreground col-span-4">Nothing yet — come back after your next session!</p>}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">🏆 My Badges</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {child.childBadges.map((cb) => (
            <Card key={cb.id} className="text-center border-0 shadow-md kid-gradient-4 text-white">
              <CardContent className="p-4">
                <div className="text-4xl mb-1">{cb.badge.icon ?? "🏅"}</div>
                <div className="text-sm font-semibold">{cb.badge.name}</div>
              </CardContent>
            </Card>
          ))}
          {child.childBadges.length === 0 && <p className="text-muted-foreground col-span-4">No badges yet — keep going, you'll earn one soon!</p>}
        </div>
      </div>
    </div>
  );
}
