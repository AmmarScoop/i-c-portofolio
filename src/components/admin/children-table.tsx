"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, GraduationCap, Award, Trash2, AlertTriangle, KeyRound } from "lucide-react";
import { TRACK_LABELS } from "@/lib/utils";

type ChildRow = {
  id: string;
  fullName: string;
  age: number;
  parentName: string;
  parentPhone: string;
  preferredTrack: string | null;
  skillLevel: string | null;
  enrollments: { id: string; status: string; course: { id: string; name: string; track: string } }[];
  unpaidCount: number;
  portfolioCount: number;
  badgeCount: number;
};

/**
 * Children list table with row selection + bulk actions. The page (server
 * component) does the filtering/sorting/searching and hands this component
 * the already-resolved rows, plus the course/badge lookups bulk actions need.
 *
 * Bulk actions implemented:
 *  - Export Selected to Excel (POST /api/children/export)
 *  - Enroll Selected into a Course (loops POST /api/enrollments per child)
 *  - Apply a Badge to Selected (loops POST /api/badges/assign per child)
 */
export function ChildrenTable({
  children,
  courses,
  badges,
}: {
  children: ChildRow[];
  courses: { id: string; name: string; track: string }[];
  badges: { id: string; name: string; icon: string | null }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollCourseId, setEnrollCourseId] = useState("");
  const [badgeOpen, setBadgeOpen] = useState(false);
  const [badgeId, setBadgeId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const allSelected = children.length > 0 && selected.size === children.length;
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(children.map((c) => c.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleExportSelected() {
    setExporting(true);
    const res = await fetch("/api/children/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    });
    setExporting(false);
    if (!res.ok) return toast.error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `children_export_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedIds.length} children`);
  }

  async function handleBulkEnroll() {
    if (!enrollCourseId) return;
    setBulkLoading(true);
    let ok = 0, failed = 0;
    for (const childId of selectedIds) {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, courseId: enrollCourseId }),
      });
      res.ok ? ok++ : failed++;
    }
    setBulkLoading(false);
    setEnrollOpen(false);
    toast.success(`Enrolled ${ok} children${failed ? ` (${failed} failed)` : ""}`);
    router.refresh();
  }

  async function handleBulkBadge() {
    if (!badgeId) return;
    setBulkLoading(true);
    let ok = 0, skipped = 0;
    for (const childId of selectedIds) {
      const res = await fetch("/api/badges/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, badgeId }),
      });
      res.ok ? ok++ : skipped++;
    }
    setBulkLoading(false);
    setBadgeOpen(false);
    toast.success(`Awarded badge to ${ok} children${skipped ? ` (${skipped} already had it)` : ""}`);
    router.refresh();
  }

  async function handleBulkLogins() {
    setBulkLoading(true);
    let ok = 0, failed = 0;
    for (const childId of selectedIds) {
      const res = await fetch(`/api/children/${childId}/create-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      res.ok ? ok++ : failed++;
    }
    setBulkLoading(false);
    setLoginOpen(false);
    toast.success(`Logins ready for ${ok} children${failed ? ` (${failed} failed)` : ""}. Use "Export to Excel" to get the credentials.`, { duration: 8000 });
    router.refresh();
  }

  async function handleBulkDelete() {
    setBulkLoading(true);
    let ok = 0, failed = 0;
    for (const childId of selectedIds) {
      const res = await fetch(`/api/children/${childId}`, { method: "DELETE" });
      res.ok ? ok++ : failed++;
    }
    setBulkLoading(false);
    setDeleteOpen(false);
    setSelected(new Set());
    if (failed) toast.error(`Deleted ${ok} children, ${failed} failed`);
    else toast.success(`Deleted ${ok} children`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={handleExportSelected} disabled={exporting}>
              <Download className="h-4 w-4 mr-1" /> {exporting ? "Exporting..." : "Export to Excel"}
            </Button>

            <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><GraduationCap className="h-4 w-4 mr-1" /> Enroll in Course</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Enroll {selected.size} children</DialogTitle></DialogHeader>
                <Select value={enrollCourseId} onValueChange={setEnrollCourseId}>
                  <SelectTrigger><SelectValue placeholder="Choose a course" /></SelectTrigger>
                  <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.track})</SelectItem>)}</SelectContent>
                </Select>
                <DialogFooter>
                  <Button onClick={handleBulkEnroll} disabled={bulkLoading || !enrollCourseId}>{bulkLoading ? "Enrolling..." : "Enroll"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={badgeOpen} onOpenChange={setBadgeOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Award className="h-4 w-4 mr-1" /> Apply Badge</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Award a badge to {selected.size} children</DialogTitle></DialogHeader>
                <Select value={badgeId} onValueChange={setBadgeId}>
                  <SelectTrigger><SelectValue placeholder="Choose a badge" /></SelectTrigger>
                  <SelectContent>{badges.map((b) => <SelectItem key={b.id} value={b.id}>{b.icon ?? "🏅"} {b.name}</SelectItem>)}</SelectContent>
                </Select>
                <DialogFooter>
                  <Button onClick={handleBulkBadge} disabled={bulkLoading || !badgeId}>{bulkLoading ? "Awarding..." : "Award Badge"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><KeyRound className="h-4 w-4 mr-1" /> Create Logins</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create logins for {selected.size} {selected.size === 1 ? "child" : "children"}?</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Each selected child gets a login for the child dashboard (email based on their name, default
                  password). Children who already have a login get it <strong>reset</strong>. Afterward, use
                  "Export to Excel" on the same selection — the sheet includes each child's login email and password.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setLoginOpen(false)} disabled={bulkLoading}>Cancel</Button>
                  <Button onClick={handleBulkLogins} disabled={bulkLoading}>
                    {bulkLoading ? "Creating..." : "Create Logins"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4 mr-1" /> Delete Selected</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" /> Delete {selected.size} {selected.size === 1 ? "child" : "children"}?
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  This permanently deletes {selected.size === 1 ? "this child" : "these children"} along with all their
                  enrollments, attendance records, portfolio items, payments, and badges. This cannot be undone.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={bulkLoading}>Cancel</Button>
                  <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkLoading}>
                    {bulkLoading ? "Deleting..." : `Delete ${selected.size} ${selected.size === 1 ? "child" : "children"}`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Payments</TableHead>
                <TableHead>Portfolio</TableHead>
                <TableHead>Badges</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {children.map((child) => (
                <TableRow key={child.id} data-state={selected.has(child.id) ? "selected" : undefined}>
                  <TableCell><Checkbox checked={selected.has(child.id)} onCheckedChange={() => toggleOne(child.id)} /></TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/admin/children/${child.id}`} className="hover:underline text-primary">{child.fullName}</Link>
                  </TableCell>
                  <TableCell>{child.age}</TableCell>
                  <TableCell>{child.parentName}</TableCell>
                  <TableCell>{child.parentPhone}</TableCell>
                  <TableCell>{child.preferredTrack ? TRACK_LABELS[child.preferredTrack]?.en ?? child.preferredTrack : "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {child.enrollments.map((e) => (
                        <Badge key={e.id} variant={e.course.track === "ROBOTICS" ? "secondary" : "outline"}>{e.course.name}</Badge>
                      ))}
                      {child.enrollments.length === 0 && <span className="text-xs text-muted-foreground">Not enrolled</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {child.unpaidCount > 0 ? (
                      <Badge variant="warning">{child.unpaidCount} unpaid</Badge>
                    ) : (
                      <Badge variant="success">Up to date</Badge>
                    )}
                  </TableCell>
                  <TableCell>{child.portfolioCount}</TableCell>
                  <TableCell>{child.badgeCount}</TableCell>
                  <TableCell><Link href={`/admin/children/${child.id}`} className="text-sm text-primary hover:underline">View →</Link></TableCell>
                </TableRow>
              ))}
              {children.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No children match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
