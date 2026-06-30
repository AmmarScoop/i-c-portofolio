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

export function BadgeFormDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🏅");
  const [triggerType, setTriggerType] = useState("MANUAL");
  const [triggerValue, setTriggerValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/badges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, description, icon, triggerType,
        triggerValue: triggerValue ? Number(triggerValue) : null,
      }),
    });
    setLoading(false);
    if (!res.ok) return toast.error("Failed to create badge");
    toast.success("Badge created");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> New Badge</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Badge</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2 col-span-1">
              <Label>Icon</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} />
            </div>
            <div className="space-y-2 col-span-3">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Trigger</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manual only</SelectItem>
                <SelectItem value="ATTENDANCE_COUNT">Attendance count ≥ N sessions present</SelectItem>
                <SelectItem value="PROJECT_COUNT">Portfolio items ≥ N</SelectItem>
                <SelectItem value="LEVEL_COMPLETED">Levels completed ≥ N</SelectItem>
                <SelectItem value="COURSE_COMPLETED">Courses completed ≥ N</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {triggerType !== "MANUAL" && (
            <div className="space-y-2">
              <Label>Trigger Value (N)</Label>
              <Input type="number" value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} placeholder="e.g. 10" />
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Create Badge"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
