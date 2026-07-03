// Read-only: prints children, enrollments, attendance, sessions/products,
// and portfolio items so we can see why portfolio is empty.
//   node scripts/inspect-attendance.mjs
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const prisma = new PrismaClient();

const courses = await prisma.course.findMany({
  include: { levels: { include: { sessions: { include: { products: true }, orderBy: { sessionNumber: "asc" } } }, orderBy: { levelNumber: "asc" } } },
});
console.log("=== COURSES / SESSIONS / PRODUCTS ===");
for (const c of courses) {
  console.log(`COURSE "${c.name}"`);
  for (const l of c.levels) {
    for (const s of l.sessions) {
      console.log(`  L${l.levelNumber} S${s.sessionNumber} "${s.title}" — ${s.products.length} product(s)`);
    }
    if (l.sessions.length === 0) console.log(`  L${l.levelNumber} — no sessions`);
  }
  if (c.levels.length === 0) console.log("  (no levels)");
}

const children = await prisma.child.findMany({
  include: {
    enrollments: { include: { course: true, currentLevel: true } },
    attendances: { include: { session: { include: { level: true } } } },
    portfolioItems: true,
  },
  orderBy: { fullName: "asc" },
});
console.log(`\n=== ${children.length} CHILDREN ===`);
for (const ch of children) {
  const enr = ch.enrollments.map((e) => `${e.course.name} @ L${e.currentLevel?.levelNumber ?? "?"} (${e.status})`).join(", ") || "NOT ENROLLED";
  const att = ch.attendances.map((a) => `L${a.session.level.levelNumber}S${a.session.sessionNumber}:${a.status}`).join(" ") || "no attendance";
  console.log(`${ch.fullName}`);
  console.log(`  enrollments: ${enr}`);
  console.log(`  attendance:  ${att}`);
  console.log(`  portfolio:   ${ch.portfolioItems.length} item(s) (${ch.portfolioItems.filter((p) => p.isActive).length} active)`);
}
await prisma.$disconnect();
