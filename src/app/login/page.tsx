"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Sparkles, Trophy, Rocket } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (!res || res.error) {
      toast.error("Invalid email or password / بيانات الدخول غير صحيحة");
      return;
    }

    // Figure out where to send the user based on their role.
    const meRes = await fetch("/api/me");
    const me = await meRes.json();
    router.push(me.role === "ADMIN" ? "/admin/dashboard" : "/child/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between kid-gradient-1 text-white p-12 overflow-hidden">
        <div className="dot-grid absolute inset-0" />
        <div className="blob bg-kid-yellow h-72 w-72 -top-16 -left-16" />
        <div className="blob bg-kid-red h-80 w-80 bottom-10 -right-20" />

        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="I.C Robotics Academy logo" className="h-12 w-12 object-contain drop-shadow" />
          <div>
            <div className="font-bold text-lg leading-tight">I.C Robotics Academy</div>
            <div className="text-sm text-white/70">Portfolio & Progress</div>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Where kids build robots, apps & big ideas
          </h1>
          <p className="text-white/80">
            Track every session, celebrate every creation, and watch your child&apos;s
            skills grow — one project at a time.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Bot, label: "Robotics" },
              { icon: Rocket, label: "Programming" },
              { icon: Trophy, label: "Badges" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-2xl bg-white/10 backdrop-blur p-4 text-center animate-float-slow">
                <Icon className="h-6 w-6 mx-auto mb-1.5" />
                <div className="text-xs font-semibold">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-white/50">
          © {new Date().getFullYear()} I.C Robotics Academy
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="I.C Robotics Academy logo" className="mx-auto lg:mx-0 mb-4 h-16 w-16 object-contain lg:hidden" />
            <h2 className="text-2xl font-bold">Welcome back 👋</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to continue to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@academy.test" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="********" className="h-11" />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? "Signing in..." : <><Sparkles className="h-4 w-4 mr-2" /> Sign In</>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
