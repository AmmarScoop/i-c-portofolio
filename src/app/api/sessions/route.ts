import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { courseSessionSchema } from "@/lib/zod-schemas";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = courseSessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { products, ...data } = parsed.data;
  const courseSession = await prisma.courseSession.create({
    data: {
      ...data,
      products: {
        create: products.map((p, i) => ({
          name: p.name,
          type: p.type,
          description: p.description ?? null,
          imageUrl: p.imageUrl ?? null,
          imageAlt: p.imageAlt ?? null,
          sortOrder: i,
        })),
      },
    },
    include: { products: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(courseSession, { status: 201 });
}
