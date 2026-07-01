"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Home, TrendingUp, Sparkles, Award, LogOut } from "lucide-react";

const links = [
  { href: "/child/dashboard", label: "Home", emoji: "🏠", icon: Home },
  { href: "/child/progress", label: "Progress", emoji: "📈", icon: TrendingUp },
  { href: "/child/portfolio", label: "My Stuff", emoji: "✨", icon: Sparkles },
  { href: "/child/badges", label: "Badges", emoji: "🏆", icon: Award },
];

export function ChildNav() {
  const pathname = usePathname();
  return (
    <>
      <header className="kid-gradient-1 text-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2 font-bold text-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="I.C Robotics Academy logo" className="h-8 w-8 object-contain" />
            I.C Robotics Academy
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-1 text-sm bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5">
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
                active ? "kid-gradient-2 text-white shadow-md scale-105" : "bg-muted text-muted-foreground hover:bg-accent"
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
