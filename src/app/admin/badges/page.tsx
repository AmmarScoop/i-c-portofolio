import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BadgeFormDialog } from "@/components/admin/badge-form-dialog";
import { DeleteButton } from "@/components/admin/delete-button";

export default async function BadgesPage() {
  const badges = await prisma.badge.findMany({
    include: { _count: { select: { childBadges: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Badges</h1>
          <p className="text-muted-foreground">Create badges and define auto-award rules. Assign manually from a child's profile.</p>
        </div>
        <BadgeFormDialog />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {badges.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-start justify-between">
                <div className="text-3xl">{b.icon ?? "🏅"}</div>
                <DeleteButton url={`/api/badges/${b.id}`} label="" />
              </div>
              <div className="font-semibold">{b.name}</div>
              <p className="text-sm text-muted-foreground">{b.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{b.triggerType.replace("_", " ")}</Badge>
                {b.triggerValue && <Badge variant="secondary">N = {b.triggerValue}</Badge>}
                <Badge variant="success">{b._count.childBadges} awarded</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {badges.length === 0 && <p className="text-muted-foreground">No badges yet. Create your first one.</p>}
      </div>
    </div>
  );
}
