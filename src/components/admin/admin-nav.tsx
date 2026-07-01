"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BookOpen, Users, ClipboardList, CalendarCheck, Wallet, Award, LogOut,
} from "lucide-react";

const links = [
  { href: "/admin/dashboard", label: "Dashboard", labelAr: "الرئيسية", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", labelAr: "الدورات", icon: BookOpen },
  { href: "/admin/children", label: "Children", labelAr: "الأطفال", icon: Users },
  { href: "/admin/enrollments", label: "Enrollments", labelAr: "التسجيلات", icon: ClipboardList },
  { href: "/admin/attendance", label: "Attendance", labelAr: "الحضور", icon: CalendarCheck },
  { href: "/admin/payments", label: "Payments", labelAr: "المدفوعات", icon: Wallet },
  { href: "/admin/badges", label: "Badges", labelAr: "الأوسمة", icon: Award },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-kid-navy text-white min-h-screen sticky top-0">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="I.C Robotics Academy logo" className="h-9 w-9 object-contain" />
        <div>
          <div className="font-bold leading-none">I.C Robotics Academy</div>
          <div className="text-xs text-white/50 mt-1">Admin Console</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => {
          const Icon = l.icon;
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r bg-kid-yellow" />}
              <Icon className={cn("h-4 w-4", active && "text-kid-yellow")} />
              <span>{l.label}</span>
              <span className="ml-auto text-xs opacity-60">{l.labelAr}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
