import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/** Creates (or resets) a login account for a child so they can access /child/dashboard. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const child = await prisma.child.findUnique({ where: { id: params.id }, include: { user: true } });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const email = (body.email || `${child.fullName.toLowerCase().replace(/\s+/g, ".")}@academy.test`).toLowerCase();
  const password = body.password || "Child123!";
  const passwordHash = await bcrypt.hash(password, 10);

  if (child.user) {
    await prisma.user.update({ where: { id: child.user.id }, data: { email, passwordHash, name: child.fullName } });
  } else {
    const user = await prisma.user.create({ data: { name: child.fullName, email, passwordHash, role: "CHILD" } });
    await prisma.child.update({ where: { id: child.id }, data: { userId: user.id } });
  }

  return NextResponse.json({ email, password });
}
