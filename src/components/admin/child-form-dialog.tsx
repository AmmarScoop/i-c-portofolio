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

export function ChildFormDialog({ child }: { child?: any }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = !!child;
  const [form, setForm] = useState({
    fullName: child?.fullName ?? "",
    parentName: child?.parentName ?? "",
    parentPhone: child?.parentPhone ?? "",
    parentEmail: child?.parentEmail ?? "",
    age: child?.age ?? "",
    notes: child?.notes ?? "",
    emergencyContactName: child?.emergencyContactName ?? "",
    emergencyContactPhone: child?.emergencyContactPhone ?? "",
    schoolName: child?.schoolName ?? "",
    preferredTrack: child?.preferredTrack ?? "",
    skillLevel: child?.skillLevel ?? "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(isEdit ? `/api/children/${child.id}` : "/api/children", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        age: Number(form.age),
        preferredTrack: form.preferredTrack || null,
        skillLevel: form.skillLevel || null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to save child");
      return;
    }
    toast.success(isEdit ? "Child updated" : "Child added");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? <Button variant="outline" size="sm">Edit</Button> : <Button><Plus className="h-4 w-4 mr-2" /> Add Child</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit Child" : "Add Child"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Full Name / اسم الطفل</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Parent Name</Label>
              <Input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Parent Phone</Label>
              <Input value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Parent Email (optional)</Label>
              <Input type="email" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>School Name (optional)</Label>
              <Input value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Preferred Track (optional)</Label>
              <Select value={form.preferredTrack || "NONE"} onValueChange={(v) => setForm({ ...form, preferredTrack: v === "NONE" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="No preference" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No preference</SelectItem>
                  <SelectItem value="ROBOTICS">Robotics / الروبوتات</SelectItem>
                  <SelectItem value="PROGRAMMING">Programming / البرمجة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Skill Level (optional)</Label>
              <Select value={form.skillLevel || "NONE"} onValueChange={(v) => setForm({ ...form, skillLevel: v === "NONE" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Not assessed" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not assessed</SelectItem>
                  <SelectItem value="BEGINNER">Beginner</SelectItem>
                  <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                  <SelectItem value="ADVANCED">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Emergency Contact Name (optional)</Label>
              <Input value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Emergency Contact Phone (optional)</Label>
              <Input value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Child"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
