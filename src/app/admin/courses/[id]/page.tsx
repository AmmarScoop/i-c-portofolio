import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LevelFormDialog } from "@/components/admin/level-form-dialog";
import { SessionFormDialog } from "@/components/admin/session-form-dialog";
import { DeleteButton } from "@/components/admin/delete-button";
import { OUTPUT_TYPE_LABELS, TRACK_LABELS } from "@/lib/utils";
import { Layers } from "lucide-react";

export default async function CourseDetailPage({ params }: { params: { id: string } }) {
  const course = await prisma.course.findUnique({
    where: { id: params.id },
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
  });
  if (!course) notFound();

  const nextLevelNumber = (course.levels.at(-1)?.levelNumber ?? 0) + 1;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{course.name}</h1>
          <Badge variant={course.track === "ROBOTICS" ? "secondary" : "outline"}>
            {TRACK_LABELS[course.track].en} / {TRACK_LABELS[course.track].ar}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">Ages {course.minAge}–{course.maxAge}{course.description ? ` · ${course.description}` : ""}</p>
      </div>

      <div className="flex justify-end">
        <LevelFormDialog courseId={course.id} nextLevelNumber={nextLevelNumber} />
      </div>

      <div className="space-y-4">
        {course.levels.map((level) => {
          const nextSessionNumber = (level.sessions.at(-1)?.sessionNumber ?? 0) + 1;
          return (
            <Card key={level.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/40 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {level.levelNumber}
                  </div>
                  <div>
                    <CardTitle className="text-base">Level {level.levelNumber}: {level.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{level.description}{level.price ? ` · Price: ${level.price}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SessionFormDialog levelId={level.id} nextSessionNumber={nextSessionNumber} />
                  <DeleteButton url={`/api/levels/${level.id}`} confirmText="Delete this level and its sessions?" />
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {level.sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sessions yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {level.sessions.map((s) => {
                      const first = s.products[0];
                      const extra = s.products.length - 1;
                      return (
                        <div key={s.id} className="group rounded-xl border overflow-hidden bg-card hover:shadow-md transition-shadow">
                          <div className="relative">
                            {first?.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={first.imageUrl} alt={first.imageAlt || first.name} className="h-24 w-full object-cover" />
                            ) : (
                              <div className="h-24 w-full flex items-center justify-center bg-muted text-3xl">
                                {OUTPUT_TYPE_LABELS[first?.type ?? "OTHER"]?.emoji}
                              </div>
                            )}
                            {extra > 0 && (
                              <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5">
                                <Layers className="h-3 w-3" /> +{extra} more
                              </span>
                            )}
                          </div>
                          <div className="p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-muted-foreground">Session {s.sessionNumber}</span>
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <SessionFormDialog levelId={level.id} nextSessionNumber={s.sessionNumber} session={s} />
                                <DeleteButton url={`/api/sessions/${s.id}`} label="" />
                              </div>
                            </div>
                            <div className="font-medium text-sm">{s.title}</div>
                            <ul className="space-y-0.5">
                              {s.products.map((p) => (
                                <li key={p.id} className="flex items-center gap-1 text-sm">
                                  <span>{OUTPUT_TYPE_LABELS[p.type]?.emoji}</span>
                                  <span className="truncate">{p.name}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {Array.from(new Set(s.products.map((p) => p.type))).map((t) => (
                                <Badge key={t} variant="outline" className="text-[10px]">{OUTPUT_TYPE_LABELS[t]?.en}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {course.levels.length === 0 && <p className="text-muted-foreground">No levels yet. Add the first level above.</p>}
      </div>
    </div>
  );
}
