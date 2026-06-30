import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { uploadSessionProductImage, deleteSessionProductImage, validateImageFile } from "@/lib/storage";

/**
 * POST /api/upload
 * Admin-only generic image upload endpoint, currently used for session
 * "product" photos (see src/lib/storage.ts for the local-disk/Supabase
 * backend abstraction). Accepts multipart/form-data with a single `file`
 * field. Validates type (jpg/png/webp) and size (max 5MB) before storing.
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const validation = validateImageFile(file);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  try {
    const { url } = await uploadSessionProductImage(file);
    return NextResponse.json({ url }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/upload?url=...
 * Best-effort removal of a previously-uploaded image (e.g. the admin
 * uploaded a photo, then replaced it before saving the session form). Safe
 * to call even if the file no longer exists.
 */
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  await deleteSessionProductImage(url);
  return NextResponse.json({ ok: true });
}
