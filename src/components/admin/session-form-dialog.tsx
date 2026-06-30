"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Plus, Pencil } from "lucide-react";
import { OUTPUT_TYPE_LABELS } from "@/lib/utils";

type SessionLike = {
  id: string;
  title: string;
  description?: string | null;
  outputType: string;
  outputName: string;
  outputDescription?: string | null;
  productImageUrl?: string | null;
  productImageAlt?: string | null;
};

/**
 * Add/Edit dialog for a course session, including the session "product"
 * photo (see ImageUploadField for the upload/replace/remove mechanics, and
 * src/lib/storage.ts for where the file actually ends up). When editing, a
 * removed/replaced photo is reflected immediately since the upload field
 * uploads eagerly and the form only ever stores the resulting URL.
 */
export function SessionFormDialog({
  levelId,
  nextSessionNumber,
  session,
}: {
  levelId: string;
  nextSessionNumber: number;
  session?: SessionLike;
}) {
  const router = useRouter();
  const isEdit = !!session;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(session?.title ?? `Session ${nextSessionNumber}`);
  const [description, setDescription] = useState(session?.description ?? "");
  const [outputType, setOutputType] = useState(session?.outputType ?? "PROJECT");
  const [outputName, setOutputName] = useState(session?.outputName ?? "");
  const [outputDescription, setOutputDescription] = useState(session?.outputDescription ?? "");
  const [productImageUrl, setProductImageUrl] = useState<string | null>(session?.productImageUrl ?? null);
  const [productImageAlt, setProductImageAlt] = useState(session?.productImageAlt ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      levelId,
      sessionNumber: nextSessionNumber,
      title,
      description,
      outputType,
      outputName,
      outputDescription,
      productImageUrl,
      productImageAlt: productImageUrl ? productImageAlt : null,
    };
    const res = await fetch(isEdit ? `/api/sessions/${session!.id}` : "/api/sessions", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) return toast.error(isEdit ? "Failed to update session" : "Failed to add session");
    toast.success(isEdit ? "Session updated" : "Session added");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit session">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Add Session</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? `Edit Session ${session!.title}` : `Add Session ${nextSessionNumber}`}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Session Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Output Type</Label>
            <Select value={outputType} onValueChange={setOutputType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(OUTPUT_TYPE_LABELS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.emoji} {val.en} / {val.ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Output / Product Name</Label>
            <Input value={outputName} onChange={(e) => setOutputName(e.target.value)} placeholder="e.g. Line-following robot" required />
          </div>
          <div className="space-y-2">
            <Label>Output Description (optional)</Label>
            <Textarea value={outputDescription} onChange={(e) => setOutputDescription(e.target.value)} rows={2} />
          </div>

          <ImageUploadField
            imageUrl={productImageUrl}
            imageAlt={productImageAlt}
            onImageUrlChange={setProductImageUrl}
            onImageAltChange={setProductImageAlt}
            label="Product Photo"
          />

          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : isEdit ? "Save Changes" : "Add Session"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
