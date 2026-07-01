import { prisma } from "@/lib/prisma";
import type { AttendanceStatus } from "@/lib/enums";

/**
 * Business rule: PortfolioItem <-> Attendance sync.
 *
 * A session can define MULTIPLE products (SessionProduct rows). When a child
 * is marked PRESENT for a session:
 *   - One PortfolioItem is auto-created PER PRODUCT, tagged
 *     createdAutomatically=true and linked via productId.
 *   - Each product's photo (SessionProduct.imageUrl), if uploaded, is copied
 *     onto its PortfolioItem.mediaUrl — this is how the child ends up seeing
 *     the real product photos on their portfolio.
 *   - PortfolioItem has a unique (childId, sessionId, productId) constraint,
 *     so if attendance is saved again for the same child/session (e.g.
 *     corrected), we upsert instead of inserting duplicates.
 *
 * When attendance for that child/session is changed away from PRESENT
 * (to ABSENT, LATE, or EXCUSED):
 *   - We do NOT hard-delete the auto-created portfolio items. Instead we set
 *     isActive=false (soft delete).
 *   - Rationale ("choose the safest approach"):
 *     1. Admins sometimes attach media/notes to a portfolio item after the
 *        session; hard-deleting would silently destroy that work the moment
 *        someone fixes a misclick on attendance.
 *     2. Soft-delete is reversible: flipping back to PRESENT simply
 *        reactivates the same rows (still keyed by the same unique
 *        childId+sessionId+productId), so no duplicates either way.
 *     3. Portfolio queries (admin + child views) filter on isActive=true, so
 *        inactive items never show up in the portfolio gallery.
 *   - Manually-created portfolio items (createdAutomatically=false) are never
 *     touched by this sync, even if they happen to reference the same session.
 *
 * Product edits on the session definition propagate forward: auto items always
 * mirror their product's current name/type/description/photo. If a product is
 * removed from a session, its auto items are deactivated by the sessions API
 * (see /api/sessions/[id]) — and this sync also deactivates any auto items
 * whose product no longer exists (productId is null after SetNull).
 */
export async function syncPortfolioForAttendance(params: {
  childId: string;
  enrollmentId: string;
  sessionId: string;
  status: AttendanceStatus;
}) {
  const { childId, enrollmentId, sessionId, status } = params;

  const session = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    include: {
      level: { include: { course: true } },
      products: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!session) throw new Error("Session not found");

  if (status === "PRESENT") {
    for (const product of session.products) {
      await prisma.portfolioItem.upsert({
        where: {
          childId_sessionId_productId: { childId, sessionId, productId: product.id },
        },
        update: {
          // Auto items always mirror the product's current definition so admin
          // edits to the session propagate forward.
          title: product.name,
          description: product.description ?? session.description ?? undefined,
          type: product.type,
          mediaUrl: product.imageUrl ?? null,
          isActive: true,
        },
        create: {
          childId,
          enrollmentId,
          courseId: session.level.courseId,
          levelId: session.levelId,
          sessionId: session.id,
          productId: product.id,
          title: product.name,
          description: product.description ?? session.description ?? undefined,
          type: product.type,
          mediaUrl: product.imageUrl ?? null,
          createdAutomatically: true,
          isActive: true,
        },
      });
    }

    // Orphaned auto items: their product was deleted from the session
    // definition (productId went null via SetNull). They should not resurface
    // just because attendance was re-saved.
    await prisma.portfolioItem.updateMany({
      where: { childId, sessionId, createdAutomatically: true, productId: null },
      data: { isActive: false },
    });
  } else {
    // ABSENT / LATE / EXCUSED: soft-deactivate all auto-created items for this
    // child+session (every product). Manually-created items are left untouched.
    await prisma.portfolioItem.updateMany({
      where: { childId, sessionId, createdAutomatically: true },
      data: { isActive: false },
    });
  }
}
