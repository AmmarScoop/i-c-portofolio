/**
 * Image storage abstraction for session "product" photos (the real
 * robot/app/game/etc a child builds in a session).
 *
 * Two backends, selected automatically based on environment variables:
 *
 *  1. Supabase Storage (used when NEXT_PUBLIC_SUPABASE_URL and
 *     SUPABASE_SERVICE_ROLE_KEY are both set). Talks to the Supabase Storage
 *     REST API directly with fetch() — no `@supabase/supabase-js` dependency
 *     needed, so this works with zero extra npm installs. Expects a bucket
 *     named by SESSION_PRODUCT_BUCKET ("session-products") to already exist
 *     and be set to public (Storage -> Buckets -> session-products -> Public).
 *
 *  2. Local filesystem (default / fallback). Writes into
 *     `public/uploads/session-products/`, which Next.js serves directly at
 *     `/uploads/session-products/<file>`. Zero-config, works out of the box
 *     for local dev and demos.
 *
 * Both backends implement the same `uploadSessionProductImage` /
 * `deleteSessionProductImage` interface, so swapping backends is just an env
 * var change — no call-site changes required. See README "Image uploads" for
 * setup instructions.
 */
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { validateImageFile } from "@/lib/image-validation";

export const SESSION_PRODUCT_BUCKET = "session-products";
export { validateImageFile, ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/image-validation";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Uploads a session product image and returns its public URL.
 * Throws on validation failure or upload error — callers (API routes) should
 * catch and return a 400 with the error message.
 */
export async function uploadSessionProductImage(file: File): Promise<{ url: string }> {
  const validation = validateImageFile(file);
  if (!validation.ok) throw new Error(validation.error);

  const ext = EXT_BY_MIME[file.type] ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isSupabaseConfigured()) {
    return uploadToSupabase(filename, buffer, file.type);
  }
  return uploadToLocalDisk(filename, buffer);
}

/** Best-effort delete (e.g. when an image is replaced or removed). Never throws — storage cleanup is non-critical. */
export async function deleteSessionProductImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (isSupabaseConfigured() && url.includes("/storage/v1/object/public/")) {
      await deleteFromSupabase(url);
    } else if (url.startsWith("/uploads/")) {
      await deleteFromLocalDisk(url);
    }
  } catch (err) {
    console.error("Failed to delete session product image (non-fatal):", err);
  }
}

// ---------------- Local filesystem backend ----------------

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", SESSION_PRODUCT_BUCKET);

async function uploadToLocalDisk(filename: string, buffer: Buffer): Promise<{ url: string }> {
  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_UPLOAD_DIR, filename), buffer);
  return { url: `/uploads/${SESSION_PRODUCT_BUCKET}/${filename}` };
}

async function deleteFromLocalDisk(url: string): Promise<void> {
  // url looks like /uploads/session-products/<file>
  const relative = url.replace(/^\/uploads\//, "");
  await unlink(path.join(process.cwd(), "public", "uploads", relative));
}

// ---------------- Supabase Storage backend (REST API, no SDK dependency) ----------------

async function uploadToSupabase(filename: string, buffer: Buffer, contentType: string): Promise<{ url: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const objectPath = filename;

  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/${SESSION_PRODUCT_BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: new Uint8Array(buffer),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase Storage upload failed (${res.status}): ${text}`);
  }

  return { url: `${supabaseUrl}/storage/v1/object/public/${SESSION_PRODUCT_BUCKET}/${objectPath}` };
}

async function deleteFromSupabase(url: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const prefix = `${supabaseUrl}/storage/v1/object/public/${SESSION_PRODUCT_BUCKET}/`;
  if (!url.startsWith(prefix)) return;
  const objectPath = url.slice(prefix.length);

  await fetch(`${supabaseUrl}/storage/v1/object/${SESSION_PRODUCT_BUCKET}/${objectPath}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
  });
}
