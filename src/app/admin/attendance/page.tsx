import { prisma } from "@/lib/prisma";
import { AttendanceManager } from "@/components/admin/attendance-manager";

export default async function AttendancePage() {
  const courses = await prisma.course.findMany({
    where: { isActive: true },
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
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">Select a course, level, and session, then mark each child's attendance. Marking a child PRESENT automatically adds every product of the session to their portfolio.</p>
      </div>
      <AttendanceManager courses={courses} />
    </div>
  );
}
