"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

const links = [
  { href: "/child/dashboard", label: "Home", emoji: "🏠" },
  { href: "/child/progress", label: "Progress", emoji: "📈" },
  { href: "/child/portfolio", label: "My Stuff", emoji: "✨" },
  { href: "/child/badges", label: "Badges", emoji: "🏆" },
];

export function ChildNav() {
  const pathname = usePathname();
  return (
    <>
      <header className="kid-gradient-1 text-white sticky top-0 z-30 shadow-md">
        <div className="dot-grid absolute inset-0 opacity-40 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2.5 font-bold text-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="I.C Robotics Academy logo" className="h-9 w-9 object-contain drop-shadow" />
            <span className="hidden sm:inline">I.C Robotics Academy</span>
            <span className="sm:hidden">I.C Robotics</span>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-1.5 text-sm bg-white/15 hover:bg-white/25 rounded-full px-4 py-1.5 transition-colors">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <nav className="max-w-5xl mx-auto flex gap-2 px-4 py-3 overflow-x-auto">
        {links.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all",
                active
                  ? "kid-gradient-2 text-white shadow-md scale-105"
                  : "bg-white border text-muted-foreground hover:border-primary/40 hover:text-foreground hover:shadow-sm"
              )}
            >
              <span>{l.emoji}</span> {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
