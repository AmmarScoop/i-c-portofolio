import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LevelSelect, StatusSelect } from "@/components/admin/level-status-controls";
import { EnrollChildPicker } from "@/components/admin/enroll-child-picker";
import { formatDate, TRACK_LABELS } from "@/lib/utils";

export default async function EnrollmentsPage() {
  const [enrollments, children, courses] = await Promise.all([
    prisma.enrollment.findMany({
      include: { child: true, course: { include: { levels: true } }, currentLevel: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.child.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
    prisma.course.findMany({ where: { isActive: true }, select: { id: true, name: true, track: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Enrollments</h1>
          <p className="text-muted-foreground">Enroll children into courses and manage their current level/status.</p>
        </div>
        <EnrollChildPicker children={children} courses={courses} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Child</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Current Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.child.fullName}</TableCell>
                  <TableCell>{e.course.name}</TableCell>
                  <TableCell><Badge variant={e.course.track === "ROBOTICS" ? "secondary" : "outline"}>{TRACK_LABELS[e.course.track].en}</Badge></TableCell>
                  <TableCell>
                    <LevelSelect enrollmentId={e.id} levels={e.course.levels.map((l) => ({ id: l.id, levelNumber: l.levelNumber, name: l.name }))} currentLevelId={e.currentLevelId} />
                  </TableCell>
                  <TableCell><StatusSelect enrollmentId={e.id} status={e.status} /></TableCell>
                  <TableCell>{formatDate(e.startedAt)}</TableCell>
                </TableRow>
              ))}
              {enrollments.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No enrollments yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
