import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const updateNoteSchema = z.object({
  note: z.string().min(1).optional(),
  type: z.enum(["GENERAL", "BEHAVIOR", "PROGRESS", "PAYMENT", "PARENT_COMMUNICATION"]).optional(),
});

/** PATCH /api/notes/[id] — edit a child note. DELETE /api/notes/[id] — remove it. Admin-only. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const note = await prisma.childNote.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(note);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.childNote.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
