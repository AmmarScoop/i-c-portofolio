// Restores session products for the "Lego - WeDo" course from
// scripts/restore-plan.json (created with scripts/photo-restore.html).
// Run from the project root:
//   node scripts/restore-lego-wedo.mjs
//
// Safe to re-run: products that already exist (same session + same name)
// are skipped, never duplicated.
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const IMAGE_BASE = "https://teahletitmrivyfolozu.supabase.co/storage/v1/object/public/session-products/";
const COURSE_ID = "cmr3pgtz6001xxdmfoxkl5h03"; // "Lego - WeDo"
const VALID_TYPES = new Set(["ROBOT", "APP", "GAME", "STORY", "PROJECT", "OTHER"]);

const plan = JSON.parse(readFileSync("scripts/restore-plan.json", "utf8"));
if (!Array.isArray(plan) || plan.length === 0) {
  console.error("restore-plan.json is empty — label your photos in photo-restore.html first.");
  process.exit(1);
}
for (const p of plan) {
  p.level = p.level ?? 1; // plans made before the level field default to Level 1
  if (!p.file || !p.name || !Number.isInteger(p.session) || p.session < 1 ||
      !Number.isInteger(p.level) || p.level < 1 || !VALID_TYPES.has(p.type)) {
    console.error("Invalid plan entry:", JSON.stringify(p));
    process.exit(1);
  }
}

const prisma = new PrismaClient();

// Locate the course: by the known id, else by name, else create it fresh.
let course = await prisma.course.findUnique({
  where: { id: COURSE_ID },
  include: { levels: { orderBy: { levelNumber: "asc" } } },
});
if (!course) {
  const all = await prisma.course.findMany({ include: { levels: { orderBy: { levelNumber: "asc" } } } });
  console.log(`Courses currently in DB: ${all.map((c) => `"${c.name}"`).join(", ") || "(none)"}`);
  course = all.find((c) => c.name.trim().toLowerCase() === "lego - wedo")
    ?? all.find((c) => c.name.toLowerCase().includes("wedo"))
    ?? all.find((c) => c.name.toLowerCase().includes("lego"));
}
if (!course) {
  course = await prisma.course.create({
    data: { name: "Lego - WeDo", track: "ROBOTICS", minAge: 5, maxAge: 12, isActive: true },
    include: { levels: true },
  });
  console.log(`Course "Lego - WeDo" was missing — created it.`);
}
console.log(`Course: "${course.name}"`);

// Find-or-create a level by its number, caching lookups.
const levelCache = new Map(course.levels.map((l) => [l.levelNumber, l]));
async function getLevel(levelNumber) {
  if (levelCache.has(levelNumber)) return levelCache.get(levelNumber);
  let level = await prisma.courseLevel.findUnique({
    where: { courseId_levelNumber: { courseId: course.id, levelNumber } },
  });
  if (!level) {
    level = await prisma.courseLevel.create({
      data: { courseId: course.id, levelNumber, name: `Level ${levelNumber}` },
    });
    console.log(`Level ${levelNumber} was missing — created it.`);
  }
  levelCache.set(levelNumber, level);
  return level;
}

// Group plan entries by (level, session).
const byGroup = new Map();
for (const p of plan) {
  const key = `${p.level}:${p.session}`;
  if (!byGroup.has(key)) byGroup.set(key, []);
  byGroup.get(key).push(p);
}

let created = 0, skipped = 0;
const sortedGroups = [...byGroup.entries()].sort(([a], [b]) => {
  const [al, as] = a.split(":").map(Number), [bl, bs] = b.split(":").map(Number);
  return al - bl || as - bs;
});
for (const [key, entries] of sortedGroups) {
  const [levelNumber, sessionNumber] = key.split(":").map(Number);
  const level = await getLevel(levelNumber);
  let session = await prisma.courseSession.findUnique({
    where: { levelId_sessionNumber: { levelId: level.id, sessionNumber } },
    include: { products: true },
  });
  if (session) {
    console.log(`Level ${levelNumber} / Session ${sessionNumber} exists ("${session.title}") — adding products to it.`);
  } else {
    session = await prisma.courseSession.create({
      data: { levelId: level.id, sessionNumber, title: `Session ${sessionNumber}` },
      include: { products: true },
    });
    console.log(`Level ${levelNumber} / Session ${sessionNumber} created.`);
  }
  let sortOrder = session.products.length;
  for (const p of entries) {
    const exists = session.products.some((ep) => ep.name.toLowerCase() === p.name.toLowerCase());
    if (exists) {
      console.log(`  ~ "${p.name}" already exists in session ${sessionNumber} — skipped.`);
      skipped++;
      continue;
    }
    await prisma.sessionProduct.create({
      data: {
        sessionId: session.id,
        name: p.name,
        type: p.type,
        description: null,
        imageUrl: IMAGE_BASE + p.file,
        imageAlt: p.name,
        sortOrder: sortOrder++,
      },
    });
    console.log(`  + "${p.name}" (${p.type}) restored with photo ${p.file.slice(0, 8)}…`);
    created++;
  }
}

console.log(`\nDone: ${created} product(s) restored, ${skipped} skipped.`);
console.log("Refresh the live site to see them. You can rename session titles in the admin UI.");
await prisma.$disconnect();
