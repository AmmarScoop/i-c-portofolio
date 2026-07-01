"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, OUTPUT_TYPE_LABELS } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, FileWarning, Sparkles } from "lucide-react";
import { ProductImage } from "@/components/shared/product-image";

type Course = {
  id: string; name: string; track: string;
  levels: {
    id: string; levelNumber: number; name: string;
    sessions: {
      id: string; sessionNumber: number; title: string;
      products: { id: string; name: string; type: string; imageUrl?: string | null; imageAlt?: string | null }[];
    }[];
  }[];
};

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present", icon: CheckCircle2, className: "text-green-600" },
  { value: "ABSENT", label: "Absent", icon: XCircle, className: "text-red-600" },
  { value: "LATE", label: "Late", icon: Clock, className: "text-amber-600" },
  { value: "EXCUSED", label: "Excused", icon: FileWarning, className: "text-blue-600" },
] as const;

export function AttendanceManager({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [courseId, setCourseId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [roster, setRoster] = useState<{ childId: string; enrollmentId: string; fullName: string }[]>([]);
  const [entries, setEntries] = useState<Record<string, { status: string; notes: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const course = courses.find((c) => c.id === courseId);
  const level = course?.levels.find((l) => l.id === levelId);
  const session = level?.sessions.find((s) => s.id === sessionId);

  async function loadRoster(newLevelId: string, newSessionId: string) {
    if (!newLevelId) return;
    setLoading(true);
    const res = await fetch(`/api/attendance?levelId=${newLevelId}${newSessionId ? `&sessionId=${newSessionId}` : ""}`);
    setLoading(false);
    if (!res.ok) return toast.error("Failed to load roster");
    const data = await res.json();
    const r = data.enrollments.map((e: any) => ({ childId: e.childId, enrollmentId: e.id, fullName: e.child.fullName }));
    setRoster(r);

    const existingMap: Record<string, { status: string; notes: string }> = {};
    for (const a of data.existingAttendance) {
      existingMap[a.childId] = { status: a.status, notes: a.notes ?? "" };
    }
    const initial: Record<string, { status: string; notes: string }> = {};
    for (const child of r) {
      initial[child.childId] = existingMap[child.childId] ?? { status: "PRESENT", notes: "" };
    }
    setEntries(initial);
  }

  function setStatus(childId: string, status: string) {
    setEntries((prev) => ({ ...prev, [childId]: { ...prev[childId], status } }));
  }
  function setNotes(childId: string, notes: string) {
    setEntries((prev) => ({ ...prev, [childId]: { ...prev[childId], notes } }));
  }

  async function handleSave() {
    if (!sessionId) return toast.error("Select a session first");
    setSaving(true);
    const payload = {
      sessionId,
      entries: roster.map((r) => ({
        childId: r.childId,
        enrollmentId: r.enrollmentId,
        status: entries[r.childId]?.status ?? "PRESENT",
        notes: entries[r.childId]?.notes || undefined,
      })),
    };
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Failed to save attendance");
    const data = await res.json();
    const badgeCount = data.results.reduce((sum: number, r: any) => sum + r.newBadges.length, 0);
    toast.success(`Attendance saved for ${data.saved} children.${badgeCount ? ` ${badgeCount} new badge(s) awarded!` : ""}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={courseId} onValueChange={(v) => { setCourseId(v); setLevelId(""); setSessionId(""); setRoster([]); }}>
              <SelectTrigger><SelectValue placeholder="Choose course" /></SelectTrigger>
              <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Level</Label>
            <Select value={levelId} onValueChange={(v) => { setLevelId(v); setSessionId(""); loadRoster(v, ""); }} disabled={!course}>
              <SelectTrigger><SelectValue placeholder="Choose level" /></SelectTrigger>
              <SelectContent>{course?.levels.map((l) => <SelectItem key={l.id} value={l.id}>Level {l.levelNumber}: {l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Session</Label>
            <Select value={sessionId} onValueChange={(v) => { setSessionId(v); loadRoster(levelId, v); }} disabled={!level}>
              <SelectTrigger><SelectValue placeholder="Choose session" /></SelectTrigger>
              <SelectContent>{level?.sessions.map((s) => <SelectItem key={s.id} value={s.id}>Session {s.sessionNumber}: {s.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {session && (
        <Card className="overflow-hidden border-amber-200 bg-amber-50/40">
          <CardContent className="p-4 space-y-3">
            <div className="font-medium">
              Session products ({session.products.length}):
            </div>
            <div className="flex flex-wrap gap-3">
              {session.products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-white p-2 pr-4">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border">
                    <ProductImage src={p.imageUrl} alt={p.imageAlt} outputType={p.type} className="h-12 w-12" />
                  </div>
                  <div className="text-sm font-medium flex items-center gap-1">
                    <span>{OUTPUT_TYPE_LABELS[p.type]?.emoji}</span> {p.name}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-amber-800 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Marking a child <strong>Present</strong> automatically creates/updates
              {session.products.length === 1 ? " a portfolio item for this product." : ` ${session.products.length} portfolio items — one per product.`}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-muted-foreground">Loading roster...</p>}

      {!loading && roster.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((r) => (
                  <TableRow key={r.childId}>
                    <TableCell className="font-medium">{r.fullName}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {STATUS_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const active = entries[r.childId]?.status === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setStatus(r.childId, opt.value)}
                              className={cn(
                                "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
                                active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                              )}
                            >
                              <Icon className="h-3 w-3" /> {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={entries[r.childId]?.notes ?? ""}
                        onChange={(e) => setNotes(r.childId, e.target.value)}
                        rows={1}
                        className="min-h-0 h-9"
                        placeholder="optional note"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!loading && sessionId && roster.length === 0 && (
        <p className="text-muted-foreground">No active enrollments currently on this level.</p>
      )}

      {roster.length > 0 && (
        <Button onClick={handleSave} disabled={saving || !sessionId}>
          {saving ? "Saving..." : "Save Attendance"}
        </Button>
      )}
    </div>
  );
}
