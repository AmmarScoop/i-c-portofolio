"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function LevelFormDialog({ courseId, nextLevelNumber }: { courseId: string; nextLevelNumber: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`Level ${nextLevelNumber}`);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  // Re-initialize from current props on every open (state would otherwise
  // stay stale after router.refresh() bumps nextLevelNumber).
  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setName(`Level ${nextLevelNumber}`);
      setDescription("");
      setPrice("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/levels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, levelNumber: nextLevelNumber, name, description, price: price ? Number(price) : null }),
    });
    setLoading(false);
    if (!res.ok) return toast.error("Failed to add level");
    toast.success("Level added");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Level</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Level {nextLevelNumber}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Level Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Price (optional)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 1200" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Add Level"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
