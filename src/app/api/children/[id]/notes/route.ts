import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { childNoteSchema } from "@/lib/zod-schemas";

/**
 * GET /api/children/[id]/notes — full note history for a child, newest first.
 * POST /api/children/[id]/notes — add a note (GENERAL/BEHAVIOR/PROGRESS/PAYMENT/PARENT_COMMUNICATION).
 * Internal admin-only tool; never exposed to the child-facing UI.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await prisma.childNote.findMany({
    where: { childId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = childNoteSchema.safeParse({ ...body, childId: params.id });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const adminName = (session.user as any).name ?? "admin";
  const note = await prisma.childNote.create({
    data: { ...parsed.data, createdBy: adminName },
  });
  return NextResponse.json(note, { status: 201 });
}
