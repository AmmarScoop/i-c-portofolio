import { prisma } from "@/lib/prisma";
import { ChildFormDialog } from "@/components/admin/child-form-dialog";
import { ExcelImportDialog } from "@/components/admin/excel-import-dialog";
import { ChildrenFilterBar } from "@/components/admin/children-filter-bar";
import { ChildrenTable } from "@/components/admin/children-table";

type SearchParams = {
  q?: string;
  age?: string;
  courseId?: string;
  track?: string;
  paymentStatus?: string;
  enrollmentStatus?: string;
  sort?: string;
};

export default async function ChildrenPage({ searchParams }: { searchParams: SearchParams }) {
  const q = searchParams?.q?.trim();
  const age = searchParams?.age ? Number(searchParams.age) : undefined;
  const courseId = searchParams?.courseId;
  const track = searchParams?.track;
  const paymentStatus = searchParams?.paymentStatus;
  const enrollmentStatus = searchParams?.enrollmentStatus;
  const sort = searchParams?.sort ?? "newest";

  // Build the Prisma where-clause from whichever filters are active. Each
  // filter is independent (AND'd together) — e.g. course + track + payment
  // status can all be combined.
  const andConditions: any[] = [];
  if (q) {
    andConditions.push({
      OR: [{ fullName: { contains: q } }, { parentName: { contains: q } }, { parentPhone: { contains: q } }],
    });
  }
  if (age !== undefined && !Number.isNaN(age)) andConditions.push({ age });
  if (courseId) andConditions.push({ enrollments: { some: { courseId } } });
  if (track) andConditions.push({ enrollments: { some: { course: { track } } } });
  if (enrollmentStatus) andConditions.push({ enrollments: { some: { status: enrollmentStatus } } });
  if (paymentStatus) andConditions.push({ payments: { some: { status: paymentStatus } } });

  const [children, courses, badges] = await Promise.all([
    prisma.child.findMany({
      where: andConditions.length ? { AND: andConditions } : undefined,
      include: {
        enrollments: { include: { course: true } },
        payments: { select: { status: true } },
        _count: { select: { portfolioItems: true, childBadges: true } },
      },
    }),
    prisma.course.findMany({ where: { isActive: true }, select: { id: true, name: true, track: true }, orderBy: { name: "asc" } }),
    prisma.badge.findMany({ select: { id: true, name: true, icon: true }, orderBy: { name: "asc" } }),
  ]);

  // Sorting happens in JS (small dataset, and "unpaid" needs a derived count
  // that's awkward to express as a portable Prisma orderBy across SQLite/Postgres).
  const rows = children.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    age: c.age,
    parentName: c.parentName,
    parentPhone: c.parentPhone,
    preferredTrack: c.preferredTrack,
    skillLevel: c.skillLevel,
    enrollments: c.enrollments.map((e) => ({ id: e.id, status: e.status, course: { id: e.course.id, name: e.course.name, track: e.course.track } })),
    unpaidCount: c.payments.filter((p) => p.status !== "PAID").length,
    portfolioCount: c._count.portfolioItems,
    badgeCount: c._count.childBadges,
    createdAt: c.createdAt,
  }));

  rows.sort((a, b) => {
    if (sort === "name") return a.fullName.localeCompare(b.fullName);
    if (sort === "age") return a.age - b.age;
    if (sort === "unpaid") return b.unpaidCount - a.unpaidCount;
    return b.createdAt.getTime() - a.createdAt.getTime(); // newest
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Children</h1>
          <p className="text-muted-foreground">Manage student records, enroll, and import in bulk.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExcelImportDialog />
          <ChildFormDialog />
        </div>
      </div>

      <ChildrenFilterBar courses={courses} />

      <ChildrenTable children={rows} courses={courses} badges={badges} />
    </div>
  );
}
