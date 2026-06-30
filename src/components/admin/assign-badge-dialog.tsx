"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Award } from "lucide-react";

export function AssignBadgeDialog({ childId, badges }: { childId: string; badges: { id: string; name: string; icon?: string | null }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [badgeId, setBadgeId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!badgeId) return;
    setLoading(true);
    const res = await fetch("/api/badges/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, badgeId, reason }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to assign badge");
      return;
    }
    toast.success("Badge awarded!");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Award className="h-4 w-4 mr-1" /> Assign Badge</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign Badge</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Badge</Label>
            <Select value={badgeId} onValueChange={setBadgeId}>
              <SelectTrigger><SelectValue placeholder="Choose a badge" /></SelectTrigger>
              <SelectContent>
                {badges.map((b) => <SelectItem key={b.id} value={b.id}>{b.icon ?? "🏅"} {b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Outstanding teamwork" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !badgeId}>{loading ? "Awarding..." : "Award Badge"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
