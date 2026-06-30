import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { courseSessionSchema } from "@/lib/zod-schemas";
import { deleteSessionProductImage } from "@/lib/storage";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = courseSessionSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.courseSession.findUnique({ where: { id: params.id } });
  const updated = await prisma.courseSession.update({ where: { id: params.id }, data: parsed.data });

  // If the product photo was replaced or removed, clean up the old file
  // (no-op for Supabase URLs that are still referenced elsewhere; best-effort only).
  if (
    existing?.productImageUrl &&
    "productImageUrl" in parsed.data &&
    parsed.data.productImageUrl !== existing.productImageUrl
  ) {
    await deleteSessionProductImage(existing.productImageUrl);
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.courseSession.findUnique({ where: { id: params.id } });
  await prisma.courseSession.delete({ where: { id: params.id } });
  if (existing?.productImageUrl) await deleteSessionProductImage(existing.productImageUrl);
  return NextResponse.json({ ok: true });
}
