"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="min-h-screen flex items-center justify-center kid-gradient-1 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-5xl">🚀</div>
          <CardTitle className="text-2xl">Kids Tech Academy</CardTitle>
          <CardDescription>أكاديمية التقنية للأطفال — Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@academy.test" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            Demo admin: admin@academy.test / Admin123! &nbsp;·&nbsp; Demo child: sara@academy.test / Child123!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
