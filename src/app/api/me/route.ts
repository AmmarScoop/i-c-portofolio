import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ role: null }, { status: 401 });
  return NextResponse.json({ role: (session.user as any).role, childId: (session.user as any).childId });
}
