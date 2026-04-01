import {
  addOneDayToYmd,
  endOfCalendarDayInTimeZone,
  endOfUpcomingSundayNight,
  formatDateOnlyInTimeZone
} from "@/lib/calendar-due-display";
import {
  type AssignmentItem,
  normalizeAssignmentStatus
} from "@/lib/assignments-list";

/** Prefer browser-local TZ so “this week” matches what users see on their device. */
export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  } catch {
    return "America/New_York";
  }
}

function ymdAddDays(ymd: string, delta: number): string {
  const [y, m, day] = ymd.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, day));
  x.setUTCDate(x.getUTCDate() + delta);
  const yy = x.getUTCFullYear();
  const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(x.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Consecutive calendar days (in `timeZone`) with ≥1 assignment marked done,
 * anchored at today or yesterday (same idea as study streak).
 */
export function computeAssignmentCompletionStreak(
  items: AssignmentItem[],
  now: Date,
  timeZone: string
): number {
  const daysWithCompletion = new Set<string>();
  for (const a of items) {
    if (normalizeAssignmentStatus(a.status) !== "done") continue;
    const raw = a.updatedAt;
    if (!raw) continue;
    daysWithCompletion.add(formatDateOnlyInTimeZone(new Date(raw), timeZone));
  }
  const today = formatDateOnlyInTimeZone(now, timeZone);
  const yest = ymdAddDays(today, -1);
  let anchor: string | null = null;
  if (daysWithCompletion.has(today)) anchor = today;
  else if (daysWithCompletion.has(yest)) anchor = yest;
  else return 0;
  let streak = 0;
  let cursor = anchor;
  while (daysWithCompletion.has(cursor)) {
    streak += 1;
    cursor = ymdAddDays(cursor, -1);
  }
  return streak;
}

export type AssignmentInsights = {
  dueThisWeek: number;
  behindSubject: { name: string; overdueCount: number } | null;
  todayProgress: { completed: number; total: number; percent: number };
  dueTomorrowCount: number;
};

/**
 * “This week” matches dashboard semantics: after end of today through end of upcoming
 * Sunday night in `timeZone` (see `endOfUpcomingSundayNight`).
 */
export function computeAssignmentInsights(
  items: AssignmentItem[],
  now: Date,
  timeZone: string
): AssignmentInsights {
  const todayYmd = formatDateOnlyInTimeZone(now, timeZone);
  const tomorrowYmd = addOneDayToYmd(todayYmd);
  const weekEnd = endOfUpcomingSundayNight(now, timeZone);
  const todayEndMs = endOfCalendarDayInTimeZone(todayYmd, timeZone).getTime();

  let dueThisWeek = 0;
  let dueTomorrowCount = 0;
  const overdueByClass = new Map<string, number>();

  let todayTotal = 0;
  let todayDone = 0;

  for (const a of items) {
    const due = new Date(a.dueAt);
    const dueMs = due.getTime();
    if (Number.isNaN(dueMs)) continue;
    const dueYmd = formatDateOnlyInTimeZone(due, timeZone);
    const isDone = normalizeAssignmentStatus(a.status) === "done";

    if (dueYmd === tomorrowYmd && !isDone) {
      dueTomorrowCount += 1;
    }

    if (dueYmd === todayYmd) {
      todayTotal += 1;
      if (isDone) todayDone += 1;
    }

    if (!isDone && dueMs < now.getTime()) {
      const name = a.classId?.name?.trim() || "Unnamed class";
      overdueByClass.set(name, (overdueByClass.get(name) ?? 0) + 1);
    }

    if (
      !isDone &&
      dueMs > todayEndMs &&
      dueMs <= weekEnd.getTime()
    ) {
      dueThisWeek += 1;
    }
  }

  let behindSubject: AssignmentInsights["behindSubject"] = null;
  for (const [name, overdueCount] of overdueByClass) {
    if (!behindSubject || overdueCount > behindSubject.overdueCount) {
      behindSubject = { name, overdueCount };
    }
  }

  const percent =
    todayTotal === 0 ? 0 : Math.round((todayDone / todayTotal) * 100);

  return {
    dueThisWeek,
    behindSubject,
    todayProgress: {
      completed: todayDone,
      total: todayTotal,
      percent
    },
    dueTomorrowCount
  };
}

export function insightSummaryLines(
  insights: AssignmentInsights,
  completionStreak: number
): string[] {
  const lines: string[] = [];
  lines.push(
    insights.dueThisWeek === 0
      ? "Nothing else due this week after today — nice breathing room."
      : `${insights.dueThisWeek} assignment${insights.dueThisWeek === 1 ? "" : "s"} due after today through Sunday night.`
  );
  if (insights.behindSubject && insights.behindSubject.overdueCount > 0) {
    lines.push(
      `Most overdue work: ${insights.behindSubject.name} (${insights.behindSubject.overdueCount} still open).`
    );
  }
  if (insights.todayProgress.total > 0) {
    lines.push(
      `Today: ${insights.todayProgress.completed}/${insights.todayProgress.total} due today marked done (${insights.todayProgress.percent}%).`
    );
  } else {
    lines.push("Nothing due today — good day to chip away at overdue or plan ahead.");
  }
  if (insights.dueTomorrowCount > 0) {
    lines.push(
      `${insights.dueTomorrowCount} due tomorrow — a quick plan tonight saves stress.`
    );
  }
  if (completionStreak > 0) {
    lines.push(
      `${completionStreak}-day streak finishing at least one task per day. Keep the chain.`
    );
  }
  return lines;
}
