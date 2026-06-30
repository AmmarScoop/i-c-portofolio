"use client";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";

type Course = { id: string; name: string };

/**
 * Search/filter/sort bar for /admin/children. Everything is encoded into the
 * URL's query string (q, age, courseId, track, paymentStatus,
 * enrollmentStatus, sort) so the result list, filters, and pagination all
 * stay server-rendered and shareable/bookmarkable.
 */
export function ChildrenFilterBar({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [age, setAge] = useState(searchParams.get("age") ?? "");
  const [courseId, setCourseId] = useState(searchParams.get("courseId") ?? "ALL");
  const [track, setTrack] = useState(searchParams.get("track") ?? "ALL");
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get("paymentStatus") ?? "ALL");
  const [enrollmentStatus, setEnrollmentStatus] = useState(searchParams.get("enrollmentStatus") ?? "ALL");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");

  function apply(overrides: Record<string, string> = {}) {
    const values: Record<string, string> = { q, age, courseId, track, paymentStatus, enrollmentStatus, sort, ...overrides };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value && value !== "ALL") params.set(key, value);
    }
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function clearAll() {
    setQ(""); setAge(""); setCourseId("ALL"); setTrack("ALL"); setPaymentStatus("ALL"); setEnrollmentStatus("ALL"); setSort("newest");
    router.push(pathname);
  }

  const hasActiveFilters = q || age || courseId !== "ALL" || track !== "ALL" || paymentStatus !== "ALL" || enrollmentStatus !== "ALL";

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by child name or parent phone..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
            />
          </div>
          <Input
            className="sm:w-28"
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
          />
          <Button onClick={() => apply()}>Search</Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearAll}><X className="h-4 w-4 mr-1" /> Clear</Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Select value={courseId} onValueChange={(v) => { setCourseId(v); apply({ courseId: v }); }}>
            <SelectTrigger><SelectValue placeholder="Course" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Courses</SelectItem>
              {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={track} onValueChange={(v) => { setTrack(v); apply({ track: v }); }}>
            <SelectTrigger><SelectValue placeholder="Track" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Tracks</SelectItem>
              <SelectItem value="ROBOTICS">Robotics / الروبوتات</SelectItem>
              <SelectItem value="PROGRAMMING">Programming / البرمجة</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentStatus} onValueChange={(v) => { setPaymentStatus(v); apply({ paymentStatus: v }); }}>
            <SelectTrigger><SelectValue placeholder="Payment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Payment Statuses</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={enrollmentStatus} onValueChange={(v) => { setEnrollmentStatus(v); apply({ enrollmentStatus: v }); }}>
            <SelectTrigger><SelectValue placeholder="Enrollment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Enrollment Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => { setSort(v); apply({ sort: v }); }}>
            <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="name">Name (A–Z)</SelectItem>
              <SelectItem value="age">Age</SelectItem>
              <SelectItem value="unpaid">Most unpaid first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
