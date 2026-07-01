"use client";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductImage } from "@/components/shared/product-image";
import { OUTPUT_TYPE_LABELS, formatDate } from "@/lib/utils";
import { Search, X } from "lucide-react";

export type PortfolioGalleryItem = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  mediaUrl?: string | null;
  createdAt: string; // ISO string (serialized server -> client)
  courseId: string;
  courseName: string;
  levelName: string;
};

const ALL = "ALL";

/**
 * Kid-friendly filterable portfolio gallery. Filters are client-side (a
 * child's portfolio is small) — search by name, filter by course and by
 * product type.
 */
export function PortfolioGallery({ items }: { items: PortfolioGalleryItem[] }) {
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState(ALL);
  const [type, setType] = useState(ALL);

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of items) map.set(it.courseId, it.courseName);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [items]);

  const typesPresent = useMemo(() => Array.from(new Set(items.map((i) => i.type))), [items]);

  const filtered = items.filter((it) => {
    if (courseId !== ALL && it.courseId !== courseId) return false;
    if (type !== ALL && it.type !== type) return false;
    if (search && !`${it.title} ${it.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hasFilters = search !== "" || courseId !== ALL || type !== ALL;

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your creations..."
            className="pl-9 rounded-full bg-white"
          />
        </div>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="sm:w-44 rounded-full bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>🎯 All courses</SelectItem>
            {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="sm:w-44 rounded-full bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>🧩 All types</SelectItem>
            {typesPresent.map((t) => (
              <SelectItem key={t} value={t}>{OUTPUT_TYPE_LABELS[t]?.emoji} {OUTPUT_TYPE_LABELS[t]?.en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(""); setCourseId(ALL); setType(ALL); }}
            className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground rounded-full px-3 py-2"
          >
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        {filtered.length} of {items.length} creation{items.length === 1 ? "" : "s"}
      </div>

      {/* Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item, i) => (
          <Card key={item.id} className="border-0 shadow-md overflow-hidden rounded-2xl hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <div className="h-36 w-full">
              <ProductImage src={item.mediaUrl} alt={item.title} outputType={item.type} className="h-36 w-full" gradientIndex={i} />
            </div>
            <CardContent className="p-4 space-y-1">
              <div className="font-bold">{item.title}</div>
              <div className="text-xs text-muted-foreground">{item.courseName} · {item.levelName}</div>
              {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
              <div className="flex items-center justify-between pt-1">
                <Badge variant="outline">{OUTPUT_TYPE_LABELS[item.type]?.emoji} {OUTPUT_TYPE_LABELS[item.type]?.en}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(new Date(item.createdAt))}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && items.length > 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-muted-foreground">Nothing matches those filters — try clearing them!</p>
        </div>
      )}
    </div>
  );
}
