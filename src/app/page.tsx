import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export default async function Home() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if ((session.user as any).role === "ADMIN") redirect("/admin/dashboard");
  redirect("/child/dashboard");
}
