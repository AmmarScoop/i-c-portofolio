"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

type ChildWithEnrollments = {
  id: string; fullName: string;
  enrollments: { id: string; course: { name: string; levels: { id: string; levelNumber: number; name: string; price: number | null }[] } }[];
};

export function PaymentFormDialog({ children }: { children: ChildWithEnrollments[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [childId, setChildId] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("UNPAID");
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const child = children.find((c) => c.id === childId);
  const enrollment = child?.enrollments.find((e) => e.id === enrollmentId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!childId || !enrollmentId || !levelId) return;
    setLoading(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, enrollmentId, levelId, amount: Number(amount || 0), status, paidAt: paidAt || undefined, notes: notes || undefined }),
    });
    setLoading(false);
    if (!res.ok) return toast.error("Failed to save payment");
    toast.success("Payment record saved");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Payment Record</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add / Update Payment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Child</Label>
            <Select value={childId} onValueChange={(v) => { setChildId(v); setEnrollmentId(""); setLevelId(""); }}>
              <SelectTrigger><SelectValue placeholder="Choose a child" /></SelectTrigger>
              <SelectContent>{children.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Course Enrollment</Label>
            <Select value={enrollmentId} onValueChange={(v) => { setEnrollmentId(v); setLevelId(""); }} disabled={!child}>
              <SelectTrigger><SelectValue placeholder="Choose enrollment" /></SelectTrigger>
              <SelectContent>{child?.enrollments.map((e) => <SelectItem key={e.id} value={e.id}>{e.course.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Level</Label>
            <Select value={levelId} onValueChange={(v) => { setLevelId(v); const lvl = enrollment?.course.levels.find((l) => l.id === v); if (lvl?.price) setAmount(String(lvl.price)); }} disabled={!enrollment}>
              <SelectTrigger><SelectValue placeholder="Choose level" /></SelectTrigger>
              <SelectContent>{enrollment?.course.levels.map((l) => <SelectItem key={l.id} value={l.id}>Level {l.levelNumber}: {l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Date (optional)</Label>
              <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Paid half, remaining due next week." />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !levelId}>{loading ? "Saving..." : "Save Payment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
