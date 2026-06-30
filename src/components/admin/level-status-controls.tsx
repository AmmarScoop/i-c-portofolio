"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LevelSelect({ enrollmentId, levels, currentLevelId }: { enrollmentId: string; levels: { id: string; levelNumber: number; name: string }[]; currentLevelId: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(currentLevelId ?? "");

  async function update(v: string) {
    setValue(v);
    const res = await fetch(`/api/enrollments/${enrollmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentLevelId: v }),
    });
    if (!res.ok) return toast.error("Failed to change level");
    toast.success("Level updated");
    router.refresh();
  }

  return (
    <Select value={value} onValueChange={update}>
      <SelectTrigger className="w-44"><SelectValue placeholder="Set level" /></SelectTrigger>
      <SelectContent>
        {levels.map((l) => <SelectItem key={l.id} value={l.id}>Level {l.levelNumber}: {l.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function StatusSelect({ enrollmentId, status }: { enrollmentId: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);

  async function update(v: string) {
    setValue(v);
    const res = await fetch(`/api/enrollments/${enrollmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: v }),
    });
    if (!res.ok) return toast.error("Failed to change status");
    toast.success("Status updated");
    router.refresh();
  }

  return (
    <Select value={value} onValueChange={update}>
      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ACTIVE">Active</SelectItem>
        <SelectItem value="COMPLETED">Completed</SelectItem>
        <SelectItem value="PAUSED">Paused</SelectItem>
        <SelectItem value="CANCELLED">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  );
}
