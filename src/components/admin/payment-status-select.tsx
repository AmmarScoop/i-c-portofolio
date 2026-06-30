"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Clear status-driven colors so admins can scan the payments table at a glance.
const STATUS_COLORS: Record<string, string> = {
  PAID: "border-green-300 bg-green-50 text-green-800",
  PARTIAL: "border-amber-300 bg-amber-50 text-amber-800",
  UNPAID: "border-red-300 bg-red-50 text-red-800",
};

export function PaymentStatusSelect({ paymentId, status }: { paymentId: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);

  async function update(v: string) {
    setValue(v);
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: v }),
    });
    if (!res.ok) return toast.error("Failed to update payment");
    toast.success("Payment updated");
    router.refresh();
  }

  return (
    <Select value={value} onValueChange={update}>
      <SelectTrigger className={cn("w-32 font-medium", STATUS_COLORS[value])}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="PAID">Paid</SelectItem>
        <SelectItem value="PARTIAL">Partial</SelectItem>
        <SelectItem value="UNPAID">Unpaid</SelectItem>
      </SelectContent>
    </Select>
  );
}
