import { redirect } from "next/navigation";
import { requireChild } from "@/lib/auth";
import { ChildNav } from "@/components/child/child-nav";

export default async function ChildLayout({ children }: { children: React.ReactNode }) {
  const session = await requireChild();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <ChildNav />
      <main className="max-w-5xl mx-auto px-4 pb-12">{children}</main>
    </div>
  );
}
