"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, BookOpen, Users, ClipboardList, CalendarCheck, Wallet, Award, LogOut, Rocket,
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
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r bg-card min-h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b">
        <Rocket className="h-6 w-6 text-primary" />
        <div>
          <div className="font-bold leading-none">Kids Tech Academy</div>
          <div className="text-xs text-muted-foreground">Admin Console</div>
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{l.label}</span>
              <span className="ml-auto text-xs opacity-70">{l.labelAr}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t">
        <Button variant="outline" className="w-full" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </aside>
  );
}
