import { prisma } from "@/lib/prisma";

/**
 * Badge auto-award engine.
 *
 * Called after attendance is saved (see /api/attendance route) for every
 * affected child. Evaluates all non-MANUAL badge rules and awards any badge
 * whose condition is newly satisfied. Awarding is idempotent: ChildBadge has
 * a unique (childId, badgeId) constraint, so re-running this is always safe.
 *
 * Supported trigger types:
 *  - ATTENDANCE_COUNT: total PRESENT attendance records >= triggerValue
 *  - PROJECT_COUNT: total active portfolio items >= triggerValue
 *  - LEVEL_COMPLETED: child has attended (PRESENT) every session in at least
 *    one level >= triggerValue times (triggerValue defaults to 1, meaning
 *    "completed at least one level")
 *  - COURSE_COMPLETED: child has an Enrollment with status COMPLETED,
 *    count >= triggerValue (defaults to 1)
 *  - MANUAL: never auto-awarded; only via the admin "assign badge" action.
 */
export async function evaluateBadgesForChild(childId: string) {
  const rules = await prisma.badge.findMany({ where: { triggerType: { not: "MANUAL" } } });
  if (rules.length === 0) return [];

  const alreadyAwarded = new Set(
    (await prisma.childBadge.findMany({ where: { childId }, select: { badgeId: true } })).map(
      (b) => b.badgeId
    )
  );

  const newlyAwarded: string[] = [];

  for (const rule of rules) {
    if (alreadyAwarded.has(rule.id)) continue;
    const target = rule.triggerValue ?? 1;
    let qualifies = false;

    if (rule.triggerType === "ATTENDANCE_COUNT") {
      const count = await prisma.attendance.count({ where: { childId, status: "PRESENT" } });
      qualifies = count >= target;
    } else if (rule.triggerType === "PROJECT_COUNT") {
      const count = await prisma.portfolioItem.count({ where: { childId, isActive: true } });
      qualifies = count >= target;
    } else if (rule.triggerType === "COURSE_COMPLETED") {
      const count = await prisma.enrollment.count({ where: { childId, status: "COMPLETED" } });
      qualifies = count >= target;
    } else if (rule.triggerType === "LEVEL_COMPLETED") {
      qualifies = (await countCompletedLevels(childId)) >= target;
    }

    if (qualifies) {
      await prisma.childBadge.create({
        data: { childId, badgeId: rule.id, awardedBy: "system", reason: `Auto-awarded: ${rule.triggerType}` },
      });
      newlyAwarded.push(rule.id);
    }
  }

  return newlyAwarded;
}

/** A level counts as "completed" when the child has a PRESENT attendance record for every session in it. */
async function countCompletedLevels(childId: string): Promise<number> {
  const enrollments = await prisma.enrollment.findMany({
    where: { childId },
    include: {
      course: { include: { levels: { include: { sessions: true } } } },
    },
  });

  const presentSessionIds = new Set(
    (
      await prisma.attendance.findMany({
        where: { childId, status: "PRESENT" },
        select: { sessionId: true },
      })
    ).map((a) => a.sessionId)
  );

  let completed = 0;
  for (const enrollment of enrollments) {
    for (const level of enrollment.course.levels) {
      if (level.sessions.length === 0) continue;
      const allDone = level.sessions.every((s) => presentSessionIds.has(s.id));
      if (allDone) completed++;
    }
  }
  return completed;
}
