import { prisma } from "@/lib/prisma";
import type { AttendanceStatus } from "@/lib/enums";

/**
 * Business rule: PortfolioItem <-> Attendance sync.
 *
 * When a child is marked PRESENT for a session:
 *   - A PortfolioItem is auto-created from that session's output definition
 *     (outputType/outputName/outputDescription), tagged createdAutomatically=true.
 *   - The session's product photo (CourseSession.productImageUrl), if the
 *     admin uploaded one, is copied onto PortfolioItem.mediaUrl — this is how
 *     the child ends up seeing the real product photo on their portfolio.
 *   - The PortfolioItem has a unique (childId, sessionId) constraint, so if
 *     attendance is saved again for the same child/session (e.g. corrected),
 *     we upsert instead of inserting a duplicate row.
 *
 * When attendance for that child/session is changed away from PRESENT
 * (to ABSENT, LATE, or EXCUSED):
 *   - We do NOT hard-delete the auto-created portfolio item. Instead we set
 *     isActive=false (soft delete).
 *   - Rationale (documented per task spec, "choose the safest approach"):
 *     1. Admins sometimes attach media/notes to a portfolio item after the
 *        session; hard-deleting would silently destroy that work the moment
 *        someone fixes a misclick on attendance.
 *     2. Soft-delete is reversible: flipping back to PRESENT simply reactivates
 *        the same row (still keyed by the same unique childId+sessionId), so no
 *        duplicates are ever created either way.
 *     3. Portfolio queries (admin + child views) filter on isActive=true, so
 *        inactive items never show up in the portfolio gallery — behaviorally
 *        identical to deletion from the user's point of view, without the risk.
 *   - Manually-created portfolio items (createdAutomatically=false) are never
 *     touched by this sync, even if they happen to reference the same session.
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
    include: { level: { include: { course: true } } },
  });
  if (!session) throw new Error("Session not found");

  if (status === "PRESENT") {
    await prisma.portfolioItem.upsert({
      where: { childId_sessionId: { childId, sessionId } },
      update: {
        isActive: true,
        // Keep output fields in sync if admin edited the session definition later,
        // but only for auto-created items (manual edits to the portfolio item are
        // preserved by checking createdAutomatically in the update's where via a
        // follow-up guard below).
      },
      create: {
        childId,
        enrollmentId,
        courseId: session.level.courseId,
        levelId: session.levelId,
        sessionId: session.id,
        title: session.outputName,
        description: session.outputDescription ?? session.description ?? undefined,
        type: session.outputType,
        // Copy the session's product photo so the child can see what they
        // actually built. Left null if the admin never uploaded one — the
        // child UI falls back to a friendly type icon in that case.
        mediaUrl: session.productImageUrl ?? null,
        createdAutomatically: true,
        isActive: true,
      },
    });

    // Re-sync title/type/description/photo only for auto-created items — auto
    // items always mirror the session's current output definition (including
    // its product photo) so admin edits to the session propagate forward.
    // Manually-created items (createdAutomatically=false) are never touched.
    await prisma.portfolioItem.updateMany({
      where: { childId, sessionId, createdAutomatically: true },
      data: {
        title: session.outputName,
        description: session.outputDescription ?? session.description ?? undefined,
        type: session.outputType,
        mediaUrl: session.productImageUrl ?? null,
        isActive: true,
      },
    });
  } else {
    // ABSENT / LATE / EXCUSED: soft-deactivate any auto-created item for this
    // child+session. Manually-created items are left untouched.
    await prisma.portfolioItem.updateMany({
      where: { childId, sessionId, createdAutomatically: true },
      data: { isActive: false },
    });
  }
}
