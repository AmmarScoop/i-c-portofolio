import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LevelFormDialog } from "@/components/admin/level-form-dialog";
import { SessionFormDialog } from "@/components/admin/session-form-dialog";
import { DeleteButton } from "@/components/admin/delete-button";
import { OUTPUT_TYPE_LABELS, TRACK_LABELS } from "@/lib/utils";

export default async function CourseDetailPage({ params }: { params: { id: string } }) {
  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: { levels: { include: { sessions: { orderBy: { sessionNumber: "asc" } } }, orderBy: { levelNumber: "asc" } } },
  });
  if (!course) notFound();

  const nextLevelNumber = (course.levels.at(-1)?.levelNumber ?? 0) + 1;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{course.name}</h1>
          <Badge variant={course.track === "ROBOTICS" ? "secondary" : "outline"}>
            {TRACK_LABELS[course.track].en} / {TRACK_LABELS[course.track].ar}
          </Badge>
        </div>
        <p className="text-muted-foreground">Ages {course.minAge}–{course.maxAge} · {course.description}</p>
      </div>

      <div className="flex justify-end">
        <LevelFormDialog courseId={course.id} nextLevelNumber={nextLevelNumber} />
      </div>

      <div className="space-y-4">
        {course.levels.map((level) => {
          const nextSessionNumber = (level.sessions.at(-1)?.sessionNumber ?? 0) + 1;
          return (
            <Card key={level.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Level {level.levelNumber}: {level.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{level.description}{level.price ? ` · Price: ${level.price}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <SessionFormDialog levelId={level.id} nextSessionNumber={nextSessionNumber} />
                  <DeleteButton url={`/api/levels/${level.id}`} confirmText="Delete this level and its sessions?" />
                </div>
              </CardHeader>
              <CardContent>
                {level.sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sessions yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {level.sessions.map((s) => (
                      <div key={s.id} className="rounded-lg border overflow-hidden">
                        {s.productImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.productImageUrl} alt={s.productImageAlt || s.outputName} className="h-24 w-full object-cover" />
                        ) : (
                          <div className="h-24 w-full flex items-center justify-center bg-muted text-3xl">
                            {OUTPUT_TYPE_LABELS[s.outputType]?.emoji}
                          </div>
                        )}
                        <div className="p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">Session {s.sessionNumber}</span>
                            <div className="flex items-center">
                              <SessionFormDialog levelId={level.id} nextSessionNumber={s.sessionNumber} session={s} />
                              <DeleteButton url={`/api/sessions/${s.id}`} label="" />
                            </div>
                          </div>
                          <div className="font-medium text-sm">{s.title}</div>
                          <div className="flex items-center gap-1 text-sm">
                            <span>{OUTPUT_TYPE_LABELS[s.outputType]?.emoji}</span>
                            <span>{s.outputName}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{OUTPUT_TYPE_LABELS[s.outputType]?.en}</Badge>
                        </div>
                      </div>
                    ))}
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
