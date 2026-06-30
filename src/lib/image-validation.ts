// Image validation rules shared between the client (instant feedback before
// upload) and the server (src/lib/storage.ts — the source of truth). Kept in
// its own file (no Node `fs`/`crypto` imports) so client components can
// import it safely.

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;
export const ALLOWED_IMAGE_EXTENSIONS = ".jpg,.jpeg,.png,.webp";
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGE_SIZE_LABEL = "5MB";

export type ImageValidationResult = { ok: true } | { ok: false; error: string };

export function validateImageFile(file: { type: string; size: number }): ImageValidationResult {
  if (!file.type || !ALLOWED_IMAGE_MIME_TYPES.includes(file.type as any)) {
    return { ok: false, error: "Invalid file type. Please upload a JPG, PNG, or WEBP image." };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { ok: false, error: `Image is too large. Maximum file size is ${MAX_IMAGE_SIZE_LABEL}.` };
  }
  return { ok: true };
}
