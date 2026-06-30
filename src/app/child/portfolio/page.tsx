import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireChild } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/shared/product-image";
import { formatDate, OUTPUT_TYPE_LABELS } from "@/lib/utils";

export default async function ChildPortfolioPage() {
  const session = await requireChild();
  if (!session) redirect("/login");
  const childId = (session.user as any).childId as string;

  const items = await prisma.portfolioItem.findMany({
    where: { childId, isActive: true },
    include: { course: true, level: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">✨ My Stuff</h1>
        <p className="text-muted-foreground">All the cool things you've built — robots, apps, games, stories, and more!</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <Card key={item.id} className="border-0 shadow-md overflow-hidden rounded-2xl hover:shadow-lg transition-shadow">
            <div className="h-32 w-full">
              <ProductImage src={item.mediaUrl} alt={item.title} outputType={item.type} className="h-32 w-full" gradientIndex={i} />
            </div>
            <CardContent className="p-4 space-y-1">
              <div className="font-bold">{item.title}</div>
              <div className="text-xs text-muted-foreground">{item.course.name} · {item.level.name}</div>
              {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
              <div className="flex items-center justify-between pt-1">
                <Badge variant="outline">{OUTPUT_TYPE_LABELS[item.type]?.en}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-3">🎨</div>
          <p className="text-muted-foreground">Nothing here yet. Attend your next session to create something awesome!</p>
        </div>
      )}
    </div>
  );
}
