import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export const OUTPUT_TYPE_LABELS: Record<string, { en: string; ar: string; emoji: string }> = {
  ROBOT: { en: "Robot", ar: "روبوت", emoji: "🤖" },
  APP: { en: "App", ar: "تطبيق", emoji: "📱" },
  GAME: { en: "Game", ar: "لعبة", emoji: "🎮" },
  STORY: { en: "Story", ar: "قصة", emoji: "📖" },
  PROJECT: { en: "Project", ar: "مشروع", emoji: "🛠️" },
  OTHER: { en: "Other", ar: "أخرى", emoji: "✨" },
};

export const TRACK_LABELS: Record<string, { en: string; ar: string }> = {
  ROBOTICS: { en: "Robotics", ar: "الروبوتات" },
  PROGRAMMING: { en: "Programming", ar: "البرمجة" },
};

export const ATTENDANCE_LABELS: Record<string, { en: string; ar: string }> = {
  PRESENT: { en: "Present", ar: "حاضر" },
  ABSENT: { en: "Absent", ar: "غائب" },
  LATE: { en: "Late", ar: "متأخر" },
  EXCUSED: { en: "Excused", ar: "معذور" },
};

export const PAYMENT_LABELS: Record<string, { en: string; ar: string }> = {
  PAID: { en: "Paid", ar: "مدفوع" },
  UNPAID: { en: "Unpaid", ar: "غير مدفوع" },
  PARTIAL: { en: "Partial", ar: "جزئي" },
};
