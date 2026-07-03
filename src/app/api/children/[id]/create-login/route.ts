import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Basic Arabic -> Latin transliteration so generated emails are always valid
// ASCII (email inputs reject Arabic characters in the local part).
const AR_MAP: Record<string, string> = {
  "ا": "a", "أ": "a", "إ": "i", "آ": "a", "ء": "", "ؤ": "o", "ئ": "e",
  "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh",
  "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh",
  "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh",
  "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
  "ه": "h", "ة": "a", "و": "w", "ي": "y", "ى": "a",
};

function emailSlug(fullName: string): string {
  const slug = fullName
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "") // strip Arabic diacritics/tatweel
    .split("")
    .map((ch) => AR_MAP[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9\s.]/g, "") // drop anything still non-ASCII
    .trim()
    .replace(/\s+/g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.|\.$/g, "");
  return slug || "student";
}

/** Creates (or resets) a login account for a child so they can access /child/dashboard. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const child = await prisma.child.findUnique({ where: { id: params.id }, include: { user: true } });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let email = (body.email || `${emailSlug(child.fullName)}@academy.test`).toLowerCase();
  // Ensure uniqueness: if another user (not this child's own account) already
  // has this email, append 2, 3, ... until free.
  const [localPart, domain] = email.split("@");
  for (let n = 2; ; n++) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (!taken || taken.id === child.userId) break;
    email = `${localPart}${n}@${domain}`;
  }
  const password = body.password || "Child123!";
  const passwordHash = await bcrypt.hash(password, 10);

  if (child.user) {
    await prisma.user.update({ where: { id: child.user.id }, data: { email, passwordHash, initialPassword: password, name: child.fullName } });
  } else {
    const user = await prisma.user.create({ data: { name: child.fullName, email, passwordHash, initialPassword: password, role: "CHILD" } });
    await prisma.child.update({ where: { id: child.id }, data: { userId: user.id } });
  }

  return NextResponse.json({ email, password });
}
