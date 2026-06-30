import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireChild } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function ChildBadgesPage() {
  const session = await requireChild();
  if (!session) redirect("/login");
  const childId = (session.user as any).childId as string;

  const childBadges = await prisma.childBadge.findMany({
    where: { childId },
    include: { badge: true },
    orderBy: { awardedAt: "desc" },
  });

  const gradients = ["kid-gradient-1", "kid-gradient-2", "kid-gradient-3", "kid-gradient-4"];

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">🏆 My Badges</h1>
        <p className="text-muted-foreground">Every achievement you've unlocked on your learning journey.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {childBadges.map((cb, i) => (
          <Card key={cb.id} className={`border-0 shadow-md text-center text-white ${gradients[i % gradients.length]}`}>
            <CardContent className="p-6 space-y-2">
              <div className="text-5xl">{cb.badge.icon ?? "🏅"}</div>
              <div className="font-bold">{cb.badge.name}</div>
              {cb.badge.description && <p className="text-xs opacity-90">{cb.badge.description}</p>}
              <div className="text-xs opacity-80">Earned {formatDate(cb.awardedAt)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {childBadges.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-3">🌟</div>
          <p className="text-muted-foreground">No badges yet. Keep attending sessions and building cool projects!</p>
        </div>
      )}
    </div>
  );
}
