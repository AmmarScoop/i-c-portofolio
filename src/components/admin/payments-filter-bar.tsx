"use client";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Course = { id: string; name: string; levels: { id: string; levelNumber: number; name: string }[] };
type ChildOption = { id: string; fullName: string };

/** Filter bar for /admin/payments: by course, level (depends on course), child, and status. */
export function PaymentsFilterBar({ courses, children }: { courses: Course[]; children: ChildOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [courseId, setCourseId] = useState(searchParams.get("courseId") ?? "ALL");
  const [levelId, setLevelId] = useState(searchParams.get("levelId") ?? "ALL");
  const [childId, setChildId] = useState(searchParams.get("childId") ?? "ALL");
  const [status, setStatus] = useState(searchParams.get("status") ?? "ALL");

  const course = courses.find((c) => c.id === courseId);

  function push(overrides: Record<string, string>) {
    const values = { courseId, levelId, childId, status, ...overrides };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) if (value && value !== "ALL") params.set(key, value);
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function clearAll() {
    setCourseId("ALL"); setLevelId("ALL"); setChildId("ALL"); setStatus("ALL");
    router.push(pathname);
  }

  const hasActive = courseId !== "ALL" || levelId !== "ALL" || childId !== "ALL" || status !== "ALL";

  return (
    <Card>
      <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Select value={courseId} onValueChange={(v) => { setCourseId(v); setLevelId("ALL"); push({ courseId: v, levelId: "ALL" }); }}>
          <SelectTrigger><SelectValue placeholder="Course" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Courses</SelectItem>
            {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={levelId} onValueChange={(v) => { setLevelId(v); push({ levelId: v }); }} disabled={!course}>
          <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Levels</SelectItem>
            {course?.levels.map((l) => <SelectItem key={l.id} value={l.id}>Level {l.levelNumber}: {l.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={childId} onValueChange={(v) => { setChildId(v); push({ childId: v }); }}>
          <SelectTrigger><SelectValue placeholder="Child" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Children</SelectItem>
            {children.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => { setStatus(v); push({ status: v }); }}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
          </SelectContent>
        </Select>

        {hasActive && (
          <Button variant="ghost" onClick={clearAll}><X className="h-4 w-4 mr-1" /> Clear Filters</Button>
        )}
      </CardContent>
    </Card>
  );
}
