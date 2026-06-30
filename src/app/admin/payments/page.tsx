import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentFormDialog } from "@/components/admin/payment-form-dialog";
import { PaymentStatusSelect } from "@/components/admin/payment-status-select";
import { PaymentsFilterBar } from "@/components/admin/payments-filter-bar";
import { formatDate } from "@/lib/utils";

type SearchParams = { courseId?: string; levelId?: string; childId?: string; status?: string };

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const { courseId, levelId, childId, status } = searchParams ?? {};

  const andConditions: any[] = [];
  if (courseId) andConditions.push({ level: { courseId } });
  if (levelId) andConditions.push({ levelId });
  if (childId) andConditions.push({ childId });
  if (status) andConditions.push({ status });

  const [payments, children, courses, allPayments] = await Promise.all([
    prisma.payment.findMany({
      where: andConditions.length ? { AND: andConditions } : undefined,
      include: { child: true, level: { include: { course: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.child.findMany({
      include: { enrollments: { include: { course: { include: { levels: true } } } } },
      orderBy: { fullName: "asc" },
    }),
    prisma.course.findMany({ where: { isActive: true }, include: { levels: true }, orderBy: { name: "asc" } }),
    // Unfiltered count for the "unpaid levels" summary card, independent of the active filters.
    prisma.payment.findMany({ where: { status: { not: "PAID" } }, select: { id: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Track subscription payments per child, per level.</p>
        </div>
        <PaymentFormDialog children={children as any} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Records</div><div className="text-2xl font-bold">{payments.length}</div></CardContent></Card>
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Unpaid / Partial Levels (all)</div>
            <div className="text-2xl font-bold text-red-700">{allPayments.length}</div>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Collected (filtered)</div><div className="text-2xl font-bold">{payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0)}</div></CardContent></Card>
      </div>

      <PaymentsFilterBar courses={courses} children={children.map((c) => ({ id: c.id, fullName: c.fullName }))} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Child</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid At</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.child.fullName}</TableCell>
                  <TableCell>{p.level.course.name}</TableCell>
                  <TableCell>{p.level.name}</TableCell>
                  <TableCell>{p.amount}</TableCell>
                  <TableCell><PaymentStatusSelect paymentId={p.id} status={p.status} /></TableCell>
                  <TableCell>{formatDate(p.paidAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.notes || "—"}</TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No payment records match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
