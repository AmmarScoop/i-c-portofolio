import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseFormDialog } from "@/components/admin/course-form-dialog";
import { DeleteButton } from "@/components/admin/delete-button";
import { TRACK_LABELS } from "@/lib/utils";

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    include: { levels: { include: { sessions: true } }, _count: { select: { enrollments: true } } },
    // Oldest first: keeps card positions stable when a new course is added
    // (newest-first made the new empty course jump to position #1, which
    // looked like the first course had been renamed/emptied).
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-muted-foreground">Manage robotics & programming courses, levels and sessions.</p>
        </div>
        <CourseFormDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => {
          const totalSessions = course.levels.reduce((sum, l) => sum + l.sessions.length, 0);
          return (
            <Card key={course.id} className="flex flex-col">
              <CardContent className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-lg">{course.name}</div>
                    <Badge variant={course.track === "ROBOTICS" ? "secondary" : "outline"}>
                      {TRACK_LABELS[course.track].en} · {TRACK_LABELS[course.track].ar}
                    </Badge>
                  </div>
                  {!course.isActive && <Badge variant="destructive">Inactive</Badge>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{course.description || "No description"}</p>
                <div className="text-sm text-muted-foreground">
                  Ages {course.minAge}–{course.maxAge} · {course.levels.length} levels · {totalSessions} sessions · {course._count.enrollments} enrolled
                </div>
                <div className="mt-auto flex items-center gap-2 pt-2">
                  <Link href={`/admin/courses/${course.id}`} className="text-sm font-medium text-primary hover:underline">
                    Manage levels & sessions →
                  </Link>
                  <div className="ml-auto flex items-center gap-1">
                    <CourseFormDialog course={course} />
                    <DeleteButton url={`/api/courses/${course.id}`} confirmText="Delete this course and all its levels/sessions?" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {courses.length === 0 && <p className="text-muted-foreground">No courses yet. Create your first course to get started.</p>}
      </div>
    </div>
  );
}
