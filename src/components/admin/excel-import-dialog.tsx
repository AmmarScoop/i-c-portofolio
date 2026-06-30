"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";

type ParsedRow = { rowNumber: number; data: Record<string, any>; valid: boolean; errors: string[] };

export function ExcelImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ total: number; validCount: number; invalidCount: number; rows: ParsedRow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setImportedCount(null);
  }

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("mode", "preview");
    const res = await fetch("/api/children/import", { method: "POST", body: form });
    setLoading(false);
    if (!res.ok) return toast.error("Failed to parse file");
    setPreview(await res.json());
  }

  async function handleCommit() {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("mode", "commit");
    const res = await fetch("/api/children/import", { method: "POST", body: form });
    setLoading(false);
    if (!res.ok) return toast.error("Import failed");
    const data = await res.json();
    setImportedCount(data.importedCount);
    toast.success(`Imported ${data.importedCount} children`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="h-4 w-4 mr-2" /> Import from Excel</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Children</DialogTitle>
          <DialogDescription>Download the template, fill it in, then upload to preview and import.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <a href="/api/children/template">
            <Button type="button" variant="secondary"><Download className="h-4 w-4 mr-2" /> Download Template</Button>
          </a>
        </div>

        <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-2">
          <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground" />
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setImportedCount(null); }}
            className="text-sm"
          />
          {file && (
            <Button type="button" size="sm" onClick={handlePreview} disabled={loading}>
              {loading ? "Parsing..." : "Preview"}
            </Button>
          )}
        </div>

        {preview && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Badge variant="success">{preview.validCount} valid</Badge>
              <Badge variant="destructive">{preview.invalidCount} invalid</Badge>
              <Badge variant="outline">{preview.total} total rows</Badge>
            </div>
            <div className="max-h-72 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((r) => (
                    <TableRow key={r.rowNumber}>
                      <TableCell>{r.rowNumber}</TableCell>
                      <TableCell>{r.data.fullName}</TableCell>
                      <TableCell>{r.data.parentName}</TableCell>
                      <TableCell>{r.data.parentPhone}</TableCell>
                      <TableCell>{String(r.data.age)}</TableCell>
                      <TableCell>
                        {r.valid ? (
                          <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" /> OK</Badge>
                        ) : (
                          <span className="text-xs text-destructive flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> {r.errors.join("; ")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {importedCount !== null && (
          <p className="text-sm font-medium text-green-700">Successfully imported {importedCount} children.</p>
        )}

        <DialogFooter>
          {preview && preview.validCount > 0 && importedCount === null && (
            <Button onClick={handleCommit} disabled={loading}>
              {loading ? "Importing..." : `Import ${preview.validCount} Children`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
