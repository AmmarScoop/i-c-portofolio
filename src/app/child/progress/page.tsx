import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireChild } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/shared/product-image";
import { OUTPUT_TYPE_LABELS, TRACK_LABELS } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

export default async function ChildProgressPage() {
  const session = await requireChild();
  if (!session) redirect("/login");
  const childId = (session.user as any).childId as string;

  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: {
      enrollments: {
        include: {
          course: {
            include: {
              levels: {
                include: {
                  sessions: {
                    include: { products: { orderBy: { sortOrder: "asc" } } },
                    orderBy: { sessionNumber: "asc" },
                  },
                },
                orderBy: { levelNumber: "asc" },
              },
            },
          },
          currentLevel: true,
        },
      },
      attendances: { select: { sessionId: true, status: true } },
    },
  });
  if (!child) redirect("/login");

  const presentSessionIds = new Set(child.attendances.filter((a) => a.status === "PRESENT").map((a) => a.sessionId));

  return (
    <div className="space-y-8 py-6">
      <div>
        <h1 className="text-2xl font-bold">📈 My Progress</h1>
        <p className="text-muted-foreground">See how far you've come in every course and level.</p>
      </div>

      {child.enrollments.map((e) => (
        <Card key={e.id} className="border-0 shadow-md overflow-hidden">
          <div className={e.course.track === "ROBOTICS" ? "kid-gradient-2 h-2" : "kid-gradient-3 h-2"} />
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-bold text-lg">{e.course.name}</div>
              <Badge variant="secondary">{TRACK_LABELS[e.course.track].en}</Badge>
            </div>

            {e.course.levels.map((level) => {
              const total = level.sessions.length;
              const done = level.sessions.filter((s) => presentSessionIds.has(s.id)).length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              const isCurrent = level.id === e.currentLevelId;
              return (
                <div key={level.id} className={`rounded-xl p-4 ${isCurrent ? "bg-blue-50 ring-2 ring-primary/30" : "bg-muted/40"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Level {level.levelNumber}: {level.name} {isCurrent && <Badge className="ml-2">Current</Badge>}</div>
                    <span className="text-sm text-muted-foreground">{done}/{total}</span>
                  </div>
                  <Progress value={pct} className="mb-3" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {level.sessions.map((s) => {
                      const isDone = presentSessionIds.has(s.id);
                      const first = s.products[0];
                      return (
                        <div
                          key={s.id}
                          className={`overflow-hidden rounded-lg text-xs ${isDone ? "bg-green-50 ring-1 ring-green-200" : "bg-white border"}`}
                        >
                          {isDone && first && (
                            <div className="relative h-14 w-full">
                              <ProductImage src={first.imageUrl} alt={first.imageAlt} outputType={first.type} className="h-14 w-full" />
                              {s.products.length > 1 && (
                                <span className="absolute bottom-1 right-1 rounded-full bg-black/70 text-white text-[10px] font-semibold px-1.5 py-0.5">
                                  +{s.products.length - 1}
                                </span>
                              )}
                            </div>
                          )}
                          <div className={`flex items-center gap-1.5 p-2 ${isDone ? "text-green-800" : "text-muted-foreground"}`}>
                            {isDone ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                            <span className="truncate">{first ? OUTPUT_TYPE_LABELS[first.type]?.emoji : "📦"} {s.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {child.enrollments.length === 0 && <p className="text-muted-foreground">No courses yet.</p>}
    </div>
  );
}
