"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Note = {
  id: string;
  note: string;
  type: string;
  createdBy: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

const TYPE_LABELS: Record<string, { en: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  GENERAL: { en: "General", variant: "outline" },
  BEHAVIOR: { en: "Behavior", variant: "warning" },
  PROGRESS: { en: "Progress", variant: "success" },
  PAYMENT: { en: "Payment", variant: "secondary" },
  PARENT_COMMUNICATION: { en: "Parent Communication", variant: "default" },
};

/**
 * Internal admin-only note history for a child (Notes tab on the child
 * profile page). Supports add / edit / delete — a simple, practical
 * complement to the academy's day-to-day record keeping (behavior notes,
 * progress observations, payment follow-ups, parent calls, etc).
 */
export function ChildNotesPanel({ childId, initialNotes }: { childId: string; initialNotes: Note[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [newType, setNewType] = useState("GENERAL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!newNote.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/children/${childId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: newNote, type: newType }),
    });
    setLoading(false);
    if (!res.ok) return toast.error("Failed to add note");
    const created = await res.json();
    setNotes((prev) => [created, ...prev]);
    setNewNote("");
    toast.success("Note added");
    router.refresh();
  }

  async function handleSaveEdit(id: string) {
    if (!editText.trim()) return;
    const res = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: editText }),
    });
    if (!res.ok) return toast.error("Failed to update note");
    const updated = await res.json();
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    setEditingId(null);
    toast.success("Note updated");
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this note?")) return;
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed to delete note");
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success("Note deleted");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([key, val]) => <SelectItem key={key} value={key}>{val.en}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Write an internal note..." rows={2} className="flex-1" />
          </div>
          <Button size="sm" onClick={handleAdd} disabled={loading || !newNote.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add Note
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {notes.map((n) => {
          const meta = TYPE_LABELS[n.type] ?? TYPE_LABELS.GENERAL;
          const isEditing = editingId === n.id;
          return (
            <Card key={n.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={meta.variant}>{meta.en}</Badge>
                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(n.id); setEditText(n.note); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(n.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(n.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">{n.note}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  {n.createdBy ?? "Admin"} · {formatDate(n.createdAt)}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {notes.length === 0 && <p className="text-muted-foreground text-sm">No notes yet. Add the first one above.</p>}
      </div>
    </div>
  );
}
