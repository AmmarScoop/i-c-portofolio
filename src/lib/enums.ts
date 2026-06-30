// Central place for the string-literal "enum" values used across the app.
//
// Why this file exists: SQLite (Prisma's default connector here, for
// zero-config local dev) does not support native Prisma `enum` types, so all
// enum-like columns in prisma/schema.prisma are plain `String` columns
// instead. These TypeScript union types + value arrays give us the same
// type-safety and a single source of truth for select options, while the
// actual runtime validation happens via the matching z.enum([...]) schemas
// in src/lib/zod-schemas.ts.
//
// If you switch the datasource to PostgreSQL/MySQL (see README), you can
// optionally convert these back into native Prisma `enum` blocks.

export type Role = "ADMIN" | "CHILD";
export const ROLE_VALUES: Role[] = ["ADMIN", "CHILD"];

export type Track = "ROBOTICS" | "PROGRAMMING";
export const TRACK_VALUES: Track[] = ["ROBOTICS", "PROGRAMMING"];

export type OutputType = "ROBOT" | "APP" | "GAME" | "STORY" | "PROJECT" | "OTHER";
export const OUTPUT_TYPE_VALUES: OutputType[] = ["ROBOT", "APP", "GAME", "STORY", "PROJECT", "OTHER"];

export type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
export const ENROLLMENT_STATUS_VALUES: EnrollmentStatus[] = ["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"];

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export const ATTENDANCE_STATUS_VALUES: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

export type PaymentStatus = "PAID" | "UNPAID" | "PARTIAL";
export const PAYMENT_STATUS_VALUES: PaymentStatus[] = ["PAID", "UNPAID", "PARTIAL"];

export type BadgeTrigger = "MANUAL" | "LEVEL_COMPLETED" | "COURSE_COMPLETED" | "ATTENDANCE_COUNT" | "PROJECT_COUNT";
export const BADGE_TRIGGER_VALUES: BadgeTrigger[] = [
  "MANUAL",
  "LEVEL_COMPLETED",
  "COURSE_COMPLETED",
  "ATTENDANCE_COUNT",
  "PROJECT_COUNT",
];

export type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export const SKILL_LEVEL_VALUES: SkillLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

export type ChildNoteType = "GENERAL" | "BEHAVIOR" | "PROGRESS" | "PAYMENT" | "PARENT_COMMUNICATION";
export const CHILD_NOTE_TYPE_VALUES: ChildNoteType[] = [
  "GENERAL",
  "BEHAVIOR",
  "PROGRESS",
  "PAYMENT",
  "PARENT_COMMUNICATION",
];
