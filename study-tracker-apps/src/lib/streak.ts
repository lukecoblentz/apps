import { formatDateOnlyInTimeZone } from "@/lib/calendar-due-display";

/** YYYY-MM-DD strings for days that have at least one session (by session end time in TZ). */
export function sessionDatesFromEndedAt(
  endedAts: Date[],
  timeZone: string
): Set<string> {
  const set = new Set<string>();
  for (const d of endedAts) {
    set.add(formatDateOnlyInTimeZone(d, timeZone));
  }
  return set;
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

/** Today and yesterday as YYYY-MM-DD in `timeZone`. */
export function todayAndYesterdayYmd(now: Date, timeZone: string): {
  today: string;
  yesterday: string;
} {
  const today = formatDateOnlyInTimeZone(now, timeZone);
  const t = new Date(now.getTime());
  t.setUTCDate(t.getUTCDate() - 1);
  const yesterday = formatDateOnlyInTimeZone(t, timeZone);
  return { today, yesterday };
}

/**
 * Current streak: consecutive calendar days with ≥1 session, anchored at the most recent
 * qualifying day (today or yesterday if today is still open).
 */
export function computeCurrentStreak(
  daysWithSessions: Set<string>,
  now: Date,
  timeZone: string
): number {
  const { today, yesterday } = todayAndYesterdayYmd(now, timeZone);
  let anchor: string | null = null;
  if (daysWithSessions.has(today)) {
    anchor = today;
  } else if (daysWithSessions.has(yesterday)) {
    anchor = yesterday;
  } else {
    return 0;
  }
  let streak = 0;
  let cursor = anchor;
  while (daysWithSessions.has(cursor)) {
    streak += 1;
    cursor = ymdAddDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive days in `daysWithSessions`. */
export function computeLongestStreak(daysWithSessions: Set<string>): number {
  if (daysWithSessions.size === 0) return 0;
  const sorted = [...daysWithSessions].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (ymdAddDays(prev, 1) === cur) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}
