import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireChild } from "@/lib/auth";
import { PortfolioGallery } from "@/components/child/portfolio-gallery";

export default async function ChildPortfolioPage() {
  const session = await requireChild();
  if (!session) redirect("/login");
  const childId = (session.user as any).childId as string;

  const items = await prisma.portfolioItem.findMany({
    where: { childId, isActive: true },
    include: { course: true, level: true },
    orderBy: { createdAt: "desc" },
  });

  const galleryItems = items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    type: item.type,
    mediaUrl: item.mediaUrl,
    createdAt: item.createdAt.toISOString(),
    courseId: item.courseId,
    courseName: item.course.name,
    levelName: item.level.name,
  }));

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">✨ My Stuff</h1>
        <p className="text-muted-foreground">All the cool things you&apos;ve built — robots, apps, games, stories, and more!</p>
      </div>

      {galleryItems.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-3">🎨</div>
          <p className="text-muted-foreground">Nothing here yet. Attend your next session to create something awesome!</p>
        </div>
      ) : (
        <PortfolioGallery items={galleryItems} />
      )}
    </div>
  );
}
