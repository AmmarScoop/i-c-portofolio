"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

export function CreateLoginButton({ childId, hasLogin }: { childId: string; hasLogin: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch(`/api/children/${childId}/create-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setLoading(false);
    if (!res.ok) return toast.error("Failed to create login");
    const data = await res.json();
    toast.success(`Login ready: ${data.email} / ${data.password}`, { duration: 8000 });
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={loading}>
      <KeyRound className="h-4 w-4 mr-1" /> {hasLogin ? "Reset Login" : "Create Login"}
    </Button>
  );
}
