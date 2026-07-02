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
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { OUTPUT_TYPE_LABELS } from "@/lib/utils";

type ProductLike = {
  id?: string;
  name: string;
  type: string;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

type SessionLike = {
  id: string;
  title: string;
  description?: string | null;
  products: ProductLike[];
};

type ProductDraft = {
  id?: string; // present when editing an existing product
  key: string; // stable React key for new rows
  name: string;
  type: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string;
};

let draftKeyCounter = 0;
function newDraft(partial?: Partial<ProductDraft>): ProductDraft {
  return {
    key: `draft-${++draftKeyCounter}`,
    name: "",
    type: "PROJECT",
    description: "",
    imageUrl: null,
    imageAlt: "",
    ...partial,
  };
}

/**
 * Add/Edit dialog for a course session. A session can produce MULTIPLE
 * products — each with its own type, name, description, and photo (see
 * ImageUploadField for the upload/replace/remove mechanics, and
 * src/lib/storage.ts for where the file actually ends up). Each product
 * becomes its own auto-created portfolio item when attendance is PRESENT.
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
  const initialTitle = () => session?.title ?? `Session ${nextSessionNumber}`;
  const initialDescription = () => session?.description ?? "";
  const initialProducts = () =>
    session && session.products.length > 0
      ? session.products.map((p) =>
          newDraft({
            id: p.id,
            name: p.name,
            type: p.type,
            description: p.description ?? "",
            imageUrl: p.imageUrl ?? null,
            imageAlt: p.imageAlt ?? "",
          })
        )
      : [newDraft()];
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [products, setProducts] = useState<ProductDraft[]>(initialProducts);
  const [loading, setLoading] = useState(false);

  // Re-initialize the form from the CURRENT props every time the dialog
  // opens. Without this, the dialog keeps stale state from a previous
  // add/edit (useState initializers only run on first mount, and
  // router.refresh() updates props but not state).
  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setTitle(initialTitle());
      setDescription(initialDescription());
      setProducts(initialProducts());
    }
  }

  function updateProduct(key: string, patch: Partial<ProductDraft>) {
    setProducts((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }
  function removeProduct(key: string) {
    setProducts((prev) => (prev.length > 1 ? prev.filter((p) => p.key !== key) : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (products.some((p) => !p.name.trim())) {
      return toast.error("Every product needs a name");
    }
    setLoading(true);
    const payload = {
      levelId,
      sessionNumber: nextSessionNumber,
      title,
      description,
      products: products.map((p) => ({
        ...(p.id ? { id: p.id } : {}),
        name: p.name.trim(),
        type: p.type,
        description: p.description || null,
        imageUrl: p.imageUrl,
        imageAlt: p.imageUrl ? p.imageAlt : null,
      })),
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit session">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Add Session</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? `Edit Session: ${session!.title}` : `Add Session ${nextSessionNumber}`}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Session Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Package className="h-4 w-4" /> Products / Outputs
                <span className="text-xs font-normal text-muted-foreground">— what the child builds in this session</span>
              </Label>
              <Button type="button" size="sm" variant="secondary" onClick={() => setProducts((prev) => [...prev, newDraft()])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add product
              </Button>
            </div>

            {products.map((p, i) => (
              <div key={p.key} className="rounded-xl border bg-muted/30 p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product {i + 1}</span>
                  {products.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Remove this product"
                      onClick={() => removeProduct(p.key)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={p.type} onValueChange={(v) => updateProduct(p.key, { type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(OUTPUT_TYPE_LABELS).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.emoji} {val.en} / {val.ar}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={p.name}
                      onChange={(e) => updateProduct(p.key, { name: e.target.value })}
                      placeholder="e.g. Line-following robot"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea value={p.description} onChange={(e) => updateProduct(p.key, { description: e.target.value })} rows={2} />
                </div>

                <ImageUploadField
                  imageUrl={p.imageUrl}
                  imageAlt={p.imageAlt}
                  onImageUrlChange={(url) => updateProduct(p.key, { imageUrl: url })}
                  onImageAltChange={(alt) => updateProduct(p.key, { imageAlt: alt })}
                  label="Product Photo"
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : isEdit ? "Save Changes" : "Add Session"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
