import * as XLSX from "xlsx";
import { childImportRowSchema } from "@/lib/zod-schemas";

// Columns for the bulk-import template. fullName/parentName/parentPhone/age
// are required (enforced by childImportRowSchema); everything else is
// optional student-management context an admin can fill in up front instead
// of editing each child individually after import.
export const CHILD_TEMPLATE_COLUMNS = [
  "fullName",
  "parentName",
  "parentPhone",
  "parentEmail",
  "age",
  "dateOfBirth",
  "emergencyContactName",
  "emergencyContactPhone",
  "schoolName",
  "preferredTrack",
  "skillLevel",
  "notes",
] as const;

/** Builds the downloadable .xlsx template admins fill in to bulk-import children. */
export function buildChildImportTemplate(): Buffer {
  const headerRow = CHILD_TEMPLATE_COLUMNS;
  const sampleRow = {
    fullName: "Sara Ahmed",
    parentName: "Ahmed Ali",
    parentPhone: "0100000000",
    parentEmail: "ahmed@example.com",
    age: 9,
    dateOfBirth: "2017-03-12",
    emergencyContactName: "Mona Ali",
    emergencyContactPhone: "0111111111",
    schoolName: "Future Stars School",
    preferredTrack: "ROBOTICS",
    skillLevel: "BEGINNER",
    notes: "Interested in robotics",
  };

  const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headerRow as unknown as string[] });
  ws["!cols"] = headerRow.map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Children");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export type ParsedChildRow = {
  rowNumber: number; // 1-based, matches spreadsheet row (header = row 1)
  data: Record<string, unknown>;
  valid: boolean;
  errors: string[];
};

/** Parses an uploaded .xlsx buffer and validates every row with Zod. Nothing is written to the DB here. */
export function parseChildImportFile(buffer: ArrayBuffer): ParsedChildRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return rows.map((row, idx) => {
    // Excel stores real date cells as serial numbers (days since 1899-12-30).
    // Convert those to ISO yyyy-mm-dd; leave typed-in text dates as-is.
    let dob = row.dateOfBirth;
    if (typeof dob === "number" && isFinite(dob)) {
      dob = new Date(Date.UTC(1899, 11, 30) + dob * 86400000).toISOString().slice(0, 10);
    } else if (dob instanceof Date) {
      dob = dob.toISOString().slice(0, 10);
    }

    const normalized = {
      fullName: String(row.fullName ?? "").trim(),
      parentName: String(row.parentName ?? "").trim(),
      parentPhone: String(row.parentPhone ?? "").trim(),
      parentEmail: String(row.parentEmail ?? "").trim(),
      age: row.age,
      dateOfBirth: String(dob ?? "").trim(),
      emergencyContactName: String(row.emergencyContactName ?? "").trim(),
      emergencyContactPhone: String(row.emergencyContactPhone ?? "").trim(),
      schoolName: String(row.schoolName ?? "").trim(),
      preferredTrack: String(row.preferredTrack ?? "").trim().toUpperCase(),
      skillLevel: String(row.skillLevel ?? "").trim().toUpperCase(),
      notes: String(row.notes ?? "").trim(),
    };

    const result = childImportRowSchema.safeParse(normalized);
    return {
      rowNumber: idx + 2, // +1 for 0-index, +1 for header row
      data: normalized,
      valid: result.success,
      errors: result.success ? [] : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  });
}

// ---------- Children export (bulk action on /admin/children) ----------

export type ChildExportRow = {
  fullName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  age: number;
  dateOfBirth: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  schoolName: string;
  preferredTrack: string;
  skillLevel: string;
  courses: string;
  enrollmentStatus: string;
  paymentStatus: string;
  notes: string;
};

/** Builds an .xlsx workbook for the "Export Selected to Excel" bulk action. */
export function buildChildrenExportWorkbook(rows: ChildExportRow[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Children");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
