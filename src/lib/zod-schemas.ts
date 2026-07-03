import { z } from "zod";

// ---------- Course / Level / Session ----------
// Base object kept separate from the `.refine()`-wrapped version below so
// PATCH routes can still call `.partial()` on it (Zod's ZodEffects, which is
// what `.refine()` produces, doesn't expose `.partial()`).
export const courseBaseSchema = z.object({
  name: z.string().min(2, "Course name is required"),
  track: z.enum(["ROBOTICS", "PROGRAMMING"]),
  minAge: z.coerce.number().int().min(3).max(25),
  maxAge: z.coerce.number().int().min(3).max(25),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});
export const courseSchema = courseBaseSchema.refine((d) => d.maxAge >= d.minAge, {
  message: "Max age must be greater than or equal to min age",
  path: ["maxAge"],
});

export const courseLevelSchema = z.object({
  courseId: z.string().min(1),
  levelNumber: z.coerce.number().int().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0).optional().nullable(),
});

// One product/output of a session. `id` is present when editing an existing
// product (so the API can diff create/update/delete) and absent for new ones.
export const sessionProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Product name is required"),
  type: z.enum(["ROBOT", "APP", "GAME", "STORY", "PROJECT", "OTHER"]),
  description: z.string().optional().nullable(),
  // Set via the /api/upload endpoint (or cleared by the admin) — never a raw
  // file upload itself, the form posts JSON with the resulting storage URL.
  imageUrl: z.string().optional().nullable(),
  imageAlt: z.string().max(200).optional().nullable(),
});

export const courseSessionSchema = z.object({
  levelId: z.string().min(1),
  sessionNumber: z.coerce.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  // A session must produce at least one thing, but can produce many.
  products: z.array(sessionProductSchema).min(1, "Add at least one product"),
});

// ---------- Child ----------
export const childSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  parentName: z.string().min(2, "Parent name is required"),
  parentPhone: z.string().min(5, "Parent phone is required"),
  parentEmail: z.string().email().optional().or(z.literal("")).nullable(),
  age: z.coerce.number().int().min(3).max(25),
  dateOfBirth: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  schoolName: z.string().optional().nullable(),
  preferredTrack: z.enum(["ROBOTICS", "PROGRAMMING"]).optional().nullable(),
  skillLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional().nullable(),
});

// Looser schema used specifically for Excel-row validation (everything arrives as strings).
export const childImportRowSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  parentName: z.string().min(2, "Parent name is required"),
  parentPhone: z.string().min(5, "Parent phone is required"),
  parentEmail: z.string().email().optional().or(z.literal("")),
  age: z.coerce.number().int().min(3, "Age must be >= 3").max(25, "Age must be <= 25"),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !isNaN(Date.parse(v)), "Invalid date — use yyyy-mm-dd format"),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  schoolName: z.string().optional(),
  preferredTrack: z.enum(["ROBOTICS", "PROGRAMMING", ""]).optional(),
  skillLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", ""]).optional(),
  notes: z.string().optional(),
  // Optional enrollment position (see CHILD_TEMPLATE_COLUMNS in lib/excel.ts).
  courseName: z.string().optional(),
  levelNumber: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1, "levelNumber must be >= 1").optional()
  ),
  sessionNumber: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1, "sessionNumber must be >= 1").optional()
  ),
});

// ---------- Child Notes ----------
export const childNoteSchema = z.object({
  childId: z.string().min(1),
  note: z.string().min(1, "Note text is required"),
  type: z.enum(["GENERAL", "BEHAVIOR", "PROGRESS", "PAYMENT", "PARENT_COMMUNICATION"]).optional().default("GENERAL"),
});

// ---------- Enrollment ----------
export const enrollmentSchema = z.object({
  childId: z.string().min(1),
  courseId: z.string().min(1),
  currentLevelId: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]).optional(),
});

// ---------- Attendance ----------
export const attendanceEntrySchema = z.object({
  childId: z.string().min(1),
  enrollmentId: z.string().min(1),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  notes: z.string().optional().nullable(),
});

export const attendanceSaveSchema = z.object({
  sessionId: z.string().min(1),
  entries: z.array(attendanceEntrySchema).min(1),
});

// ---------- Payment ----------
export const paymentSchema = z.object({
  childId: z.string().min(1),
  enrollmentId: z.string().min(1),
  levelId: z.string().min(1),
  amount: z.coerce.number().min(0),
  status: z.enum(["PAID", "UNPAID", "PARTIAL"]),
  paidAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ---------- Badge ----------
export const badgeSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  track: z.enum(["ROBOTICS", "PROGRAMMING"]).optional().nullable(),
  triggerType: z.enum(["MANUAL", "LEVEL_COMPLETED", "COURSE_COMPLETED", "ATTENDANCE_COUNT", "PROJECT_COUNT"]),
  triggerValue: z.coerce.number().int().optional().nullable(),
});

export const assignBadgeSchema = z.object({
  childId: z.string().min(1),
  badgeId: z.string().min(1),
  reason: z.string().optional().nullable(),
});
