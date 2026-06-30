"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ImagePlus, Loader2, Trash2, ImageOff } from "lucide-react";
import { ALLOWED_IMAGE_EXTENSIONS, MAX_IMAGE_SIZE_LABEL, validateImageFile } from "@/lib/image-validation";

/**
 * Reusable admin upload control for the session "product photo" feature.
 * Handles: choosing a file (client-side type/size validation for instant
 * feedback), uploading it to /api/upload, previewing the result, replacing
 * it, and removing it. The parent form only deals with the resulting URL —
 * this component owns the upload mechanics.
 */
export function ImageUploadField({
  imageUrl,
  imageAlt,
  onImageUrlChange,
  onImageAltChange,
  label = "Product Photo",
}: {
  imageUrl: string | null;
  imageAlt: string;
  onImageUrlChange: (url: string | null) => void;
  onImageAltChange: (alt: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    setUploading(true);
    const previousUrl = imageUrl;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Upload failed");
      return;
    }
    const data = await res.json();
    onImageUrlChange(data.url);
    toast.success("Photo uploaded");

    // Best-effort cleanup of the file being replaced; non-blocking.
    if (previousUrl) {
      fetch(`/api/upload?url=${encodeURIComponent(previousUrl)}`, { method: "DELETE" }).catch(() => {});
    }
  }

  function handleRemove() {
    const previousUrl = imageUrl;
    onImageUrlChange(null);
    onImageAltChange("");
    if (previousUrl) {
      fetch(`/api/upload?url=${encodeURIComponent(previousUrl)}`, { method: "DELETE" }).catch(() => {});
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label} (optional)</Label>

      {imageUrl ? (
        <div className="space-y-2">
          <div className="relative w-full max-w-xs overflow-hidden rounded-lg border bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element -- local/Supabase URLs, no next/image domain config needed */}
            <img src={imageUrl} alt={imageAlt || "Session product preview"} className="h-40 w-full object-cover" />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute right-2 top-2 h-7 w-7"
              onClick={handleRemove}
              title="Remove photo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1" />}
              Replace Photo
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full max-w-xs flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-muted-foreground hover:bg-accent/50 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImageOff className="h-7 w-7" />}
          <span className="text-xs">
            {uploading ? "Uploading..." : "Click to upload a photo of the product (JPG, PNG, WEBP — max " + MAX_IMAGE_SIZE_LABEL + ")"}
          </span>
        </button>
      )}

      <input ref={inputRef} type="file" accept={ALLOWED_IMAGE_EXTENSIONS} className="hidden" onChange={handleFileSelect} />

      {imageUrl && (
        <div className="space-y-1 max-w-xs">
          <Label className="text-xs">Alt text (for accessibility)</Label>
          <Input
            value={imageAlt}
            onChange={(e) => onImageAltChange(e.target.value)}
            placeholder="e.g. A red line-following robot built from LEGO bricks"
          />
        </div>
      )}
    </div>
  );
}
