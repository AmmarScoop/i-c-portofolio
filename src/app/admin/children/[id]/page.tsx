import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChildFormDialog } from "@/components/admin/child-form-dialog";
import { EnrollDialog } from "@/components/admin/enroll-dialog";
import { AssignBadgeDialog } from "@/components/admin/assign-badge-dialog";
import { LevelSelect, StatusSelect } from "@/components/admin/level-status-controls";
import { PaymentStatusSelect } from "@/components/admin/payment-status-select";
import { CreateLoginButton } from "@/components/admin/create-login-button";
import { ChildNotesPanel } from "@/components/admin/child-notes-panel";
import { ProductImage } from "@/components/shared/product-image";
import { formatDate, OUTPUT_TYPE_LABELS, ATTENDANCE_LABELS, TRACK_LABELS } from "@/lib/utils";

export default async function ChildDetailPage({ params }: { params: { id: string } }) {
  const child = await prisma.child.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      enrollments: { include: { course: { include: { levels: true } }, currentLevel: { include: { sessions: true } } }, orderBy: { createdAt: "desc" } },
      attendances: { include: { session: { include: { level: { include: { course: true } } } } }, orderBy: { attendedAt: "desc" } },
      portfolioItems: { where: { isActive: true }, include: { session: true, level: true, course: true }, orderBy: { createdAt: "desc" } },
      payments: { include: { level: { include: { course: true } } }, orderBy: { createdAt: "desc" } },
      childBadges: { include: { badge: true }, orderBy: { awardedAt: "desc" } },
      childNotes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!child) notFound();

  const [allCourses, allBadges] = await Promise.all([
    prisma.course.findMany({ where: { isActive: true }, select: { id: true, name: true, track: true } }),
    prisma.badge.findMany(),
  ]);

  // ---- Overview summary numbers ----
  const primaryEnrollment = child.enrollments.find((e) => e.status === "ACTIVE") ?? child.enrollments[0];
  const presentSessionIds = new Set(child.attendances.filter((a) => a.status === "PRESENT").map((a) => a.sessionId));
  const currentLevelSessions = primaryEnrollment?.currentLevel?.sessions ?? [];
  const progressPct = currentLevelSessions.length
    ? Math.round((currentLevelSessions.filter((s) => presentSessionIds.has(s.id)).length / currentLevelSessions.length) * 100)
    : 0;

  const attendanceCounts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 } as Record<string, number>;
  for (const a of child.attendances) attendanceCounts[a.status] = (attendanceCounts[a.status] ?? 0) + 1;

  const totalPaid = child.payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0);
  const unpaidLevels = child.payments.filter((p) => p.status !== "PAID");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16"><AvatarFallback className="text-xl bg-primary/10 text-primary">{child.fullName.slice(0, 1)}</AvatarFallback></Avatar>
          <div>
            <h1 className="text-2xl font-bold">{child.fullName}</h1>
            <p className="text-muted-foreground">Age {child.age} · Parent: {child.parentName} · {child.parentPhone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ChildFormDialog child={child} />
          <CreateLoginButton childId={child.id} hasLogin={!!child.user} />
          <EnrollDialog childId={child.id} courses={allCourses} />
          <AssignBadgeDialog childId={child.id} badges={allBadges} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio ({child.portfolioItems.length})</TabsTrigger>
          <TabsTrigger value="badges">Badges ({child.childBadges.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({child.childNotes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Child &amp; Parent Info</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <InfoRow label="Full Name" value={child.fullName} />
                <InfoRow label="Age" value={String(child.age)} />
                <InfoRow label="Parent Name" value={child.parentName} />
                <InfoRow label="Parent Phone" value={child.parentPhone} />
                <InfoRow label="Parent Email" value={child.parentEmail || "—"} />
                <InfoRow label="School" value={child.schoolName || "—"} />
                <InfoRow label="Emergency Contact" value={child.emergencyContactName ? `${child.emergencyContactName} (${child.emergencyContactPhone || "—"})` : "—"} />
                <InfoRow label="Preferred Track" value={child.preferredTrack ? `${TRACK_LABELS[child.preferredTrack]?.en} / ${TRACK_LABELS[child.preferredTrack]?.ar}` : "—"} />
                <InfoRow label="Skill Level" value={child.skillLevel || "—"} />
                <InfoRow label="Current Course" value={primaryEnrollment?.course.name || "Not enrolled"} />
                <InfoRow label="Current Level" value={primaryEnrollment?.currentLevel?.name || "—"} />
                <InfoRow label="Quick Note" value={child.notes || "—"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Progress value={progressPct} />
                <div className="text-sm text-muted-foreground">{progressPct}% of current level complete</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Payment Summary</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>Total Paid: <span className="font-semibold">{totalPaid}</span></div>
                <div>Unpaid/Partial Levels: <span className="font-semibold">{unpaidLevels.length}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Attendance Summary</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-sm">
                <Badge variant="success">Present {attendanceCounts.PRESENT}</Badge>
                <Badge variant="destructive">Absent {attendanceCounts.ABSENT}</Badge>
                <Badge variant="warning">Late {attendanceCounts.LATE}</Badge>
                <Badge variant="outline">Excused {attendanceCounts.EXCUSED}</Badge>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Latest Portfolio Items</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {child.portfolioItems.slice(0, 3).map((p, i) => (
                  <div key={p.id} className="rounded-lg overflow-hidden border">
                    <div className="h-16 w-full"><ProductImage src={p.mediaUrl} alt={p.title} outputType={p.type} className="h-16 w-full" gradientIndex={i} /></div>
                    <div className="p-2 text-xs font-medium truncate">{p.title}</div>
                  </div>
                ))}
                {child.portfolioItems.length === 0 && <p className="text-muted-foreground text-sm col-span-3">No portfolio items yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Earned Badges</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {child.childBadges.map((cb) => (
                  <span key={cb.id} className="text-2xl" title={cb.badge.name}>{cb.badge.icon ?? "🏅"}</span>
                ))}
                {child.childBadges.length === 0 && <p className="text-muted-foreground text-sm">No badges yet.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="enrollments">
          <div className="grid gap-4">
            {child.enrollments.map((e) => (
              <Card key={e.id}>
                <CardContent className="p-5 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-semibold">{e.course.name}</div>
                    <div className="text-sm text-muted-foreground">Track: {e.course.track} · Started {formatDate(e.startedAt)}</div>
                  </div>
                  <LevelSelect enrollmentId={e.id} levels={e.course.levels.map((l) => ({ id: l.id, levelNumber: l.levelNumber, name: l.name }))} currentLevelId={e.currentLevelId} />
                  <StatusSelect enrollmentId={e.id} status={e.status} />
                </CardContent>
              </Card>
            ))}
            {child.enrollments.length === 0 && <p className="text-muted-foreground">Not enrolled in any course yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {child.attendances.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{formatDate(a.attendedAt)}</TableCell>
                      <TableCell>{a.session.level.course.name}</TableCell>
                      <TableCell>{a.session.level.name}</TableCell>
                      <TableCell>{a.session.title}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "PRESENT" ? "success" : a.status === "ABSENT" ? "destructive" : "warning"}>
                          {ATTENDANCE_LABELS[a.status]?.en}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {child.attendances.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No attendance recorded yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid At</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {child.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.level.course.name}</TableCell>
                      <TableCell>{p.level.name}</TableCell>
                      <TableCell>{p.amount}</TableCell>
                      <TableCell><PaymentStatusSelect paymentId={p.id} status={p.status} /></TableCell>
                      <TableCell>{formatDate(p.paidAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {child.payments.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payment records yet. Add them from the Payments page.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {child.portfolioItems.map((p, i) => (
              <Card key={p.id} className="overflow-hidden">
                <div className="h-28 w-full"><ProductImage src={p.mediaUrl} alt={p.title} outputType={p.type} className="h-28 w-full" gradientIndex={i} /></div>
                <CardContent className="p-5 space-y-2">
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-muted-foreground">{p.course.name} · {p.level.name}</div>
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{OUTPUT_TYPE_LABELS[p.type]?.en}</Badge>
                    {p.createdAutomatically && <Badge variant="secondary">Auto from attendance</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</div>
                </CardContent>
              </Card>
            ))}
            {child.portfolioItems.length === 0 && <p className="text-muted-foreground">No portfolio items yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="badges">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {child.childBadges.map((cb) => (
              <Card key={cb.id}>
                <CardContent className="p-5 text-center space-y-2">
                  <div className="text-4xl">{cb.badge.icon ?? "🏅"}</div>
                  <div className="font-semibold">{cb.badge.name}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(cb.awardedAt)}</div>
                  {cb.reason && <p className="text-xs text-muted-foreground">{cb.reason}</p>}
                </CardContent>
              </Card>
            ))}
            {child.childBadges.length === 0 && <p className="text-muted-foreground">No badges earned yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <ChildNotesPanel childId={child.id} initialNotes={child.childNotes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
