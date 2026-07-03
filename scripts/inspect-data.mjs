// Read-only inspection: prints every course, level, session, product, and
// portfolio item in the database. Run from the project root:
//   node scripts/inspect-data.mjs
// Makes NO changes to any data.
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

// Load DATABASE_URL from .env (plain node doesn't read .env by itself).
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const prisma = new PrismaClient();

const courses = await prisma.course.findMany({
  include: {
    levels: {
      include: { sessions: { include: { products: true }, orderBy: { sessionNumber: "asc" } } },
      orderBy: { levelNumber: "asc" },
    },
    _count: { select: { enrollments: true } },
  },
  orderBy: { createdAt: "asc" },
});

console.log(`\n=== ${courses.length} course(s) in database ===`);
for (const c of courses) {
  console.log(`\nCOURSE "${c.name}"  [id=${c.id}]`);
  console.log(`  track=${c.track}  ages ${c.minAge}-${c.maxAge}  active=${c.isActive}  enrollments=${c._count.enrollments}  created=${c.createdAt.toISOString()}`);
  if (c.levels.length === 0) console.log("  (no levels)");
  for (const l of c.levels) {
    console.log(`  LEVEL ${l.levelNumber}: "${l.name}"  [id=${l.id}]  sessions=${l.sessions.length}`);
    for (const s of l.sessions) {
      console.log(`    SESSION ${s.sessionNumber}: "${s.title}"  [id=${s.id}]`);
      for (const p of s.products) {
        console.log(`      PRODUCT "${p.name}" (${p.type})  imageUrl=${p.imageUrl ?? "none"}`);
      }
    }
  }
}

const items = await prisma.portfolioItem.findMany({
  include: { child: { select: { fullName: true } }, course: { select: { name: true } } },
  orderBy: { createdAt: "asc" },
});
console.log(`\n=== ${items.length} portfolio item(s) ===`);
for (const i of items) {
  console.log(`  "${i.title}"  child=${i.child.fullName}  course="${i.course.name}"  active=${i.isActive}  media=${i.mediaUrl ?? "none"}`);
}

// List files currently in the Supabase Storage bucket, so we can see which
// product photos still exist vs. which were deleted.
const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (sbUrl && sbKey) {
  const res = await fetch(`${sbUrl}/storage/v1/object/list/session-products`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sbKey}`, apikey: sbKey, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 100, sortBy: { column: "created_at", order: "asc" } }),
  });
  if (res.ok) {
    const files = await res.json();
    console.log(`\n=== ${files.length} file(s) in storage bucket "session-products" ===`);
    for (const f of files) console.log(`  ${f.name}  (${f.created_at ?? ""})`);
  } else {
    console.log(`\n(storage listing failed: ${res.status} ${(await res.text()).slice(0, 200)})`);
  }
}

await prisma.$disconnect();

