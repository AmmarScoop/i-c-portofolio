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

  const existing = await prisma.courseSession.findUnique({
    where: { id: params.id },
    include: { products: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { products, ...data } = parsed.data;

  // Update the session's own fields first.
  await prisma.courseSession.update({ where: { id: params.id }, data });

  // Diff the products list (only when the client sent one):
  //  - products with an id  -> update in place
  //  - products without id  -> create
  //  - existing products missing from the payload -> soft-deactivate their
  //    auto-created portfolio items, then delete the product definition.
  if (products) {
    const keptIds = new Set(products.filter((p) => p.id).map((p) => p.id as string));
    const removed = existing.products.filter((p) => !keptIds.has(p.id));

    // Deactivate auto portfolio items for removed products BEFORE deleting
    // (deletion sets PortfolioItem.productId to null, so do it in this order).
    if (removed.length > 0) {
      await prisma.portfolioItem.updateMany({
        where: { productId: { in: removed.map((p) => p.id) }, createdAutomatically: true },
        data: { isActive: false },
      });
      await prisma.sessionProduct.deleteMany({ where: { id: { in: removed.map((p) => p.id) } } });
      // Best-effort cleanup of orphaned image files.
      for (const p of removed) {
        if (p.imageUrl) await deleteSessionProductImage(p.imageUrl);
      }
    }

    for (const [i, p] of products.entries()) {
      const payload = {
        name: p.name,
        type: p.type,
        description: p.description ?? null,
        imageUrl: p.imageUrl ?? null,
        imageAlt: p.imageAlt ?? null,
        sortOrder: i,
      };
      if (p.id) {
        const before = existing.products.find((ep) => ep.id === p.id);
        await prisma.sessionProduct.update({ where: { id: p.id }, data: payload });
        // If the product photo was replaced or removed, clean up the old file.
        if (before?.imageUrl && before.imageUrl !== payload.imageUrl) {
          await deleteSessionProductImage(before.imageUrl);
        }
      } else {
        await prisma.sessionProduct.create({ data: { ...payload, sessionId: params.id } });
      }
    }
  }

  const updated = await prisma.courseSession.findUnique({
    where: { id: params.id },
    include: { products: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.courseSession.findUnique({
    where: { id: params.id },
    include: { products: true },
  });
  await prisma.courseSession.delete({ where: { id: params.id } });
  for (const p of existing?.products ?? []) {
    if (p.imageUrl) await deleteSessionProductImage(p.imageUrl);
  }
  return NextResponse.json({ ok: true });
}
