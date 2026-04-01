import { getCalendarDefaultTimeZone } from "@/lib/calendar-due-display";
import { formatDateOnlyInTimeZone } from "@/lib/calendar-due-display";
import {
  computeCurrentStreak,
  computeLongestStreak,
  sessionDatesFromEndedAt
} from "@/lib/streak";
import mongoose from "mongoose";
import { StudySessionModel } from "@/models/StudySession";

export type WeeklyBarPoint = { day: string; label: string; minutes: number };

function weekdayShort(ymd: string, timeZone: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const dt = new Date(utc);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone
  }).format(dt);
}

/** Last `numDays` calendar days ending at `endYmd` (inclusive), oldest first. */
function rollingDaysEndAt(endYmd: string, numDays: number): string[] {
  const out: string[] = [];
  let cur = endYmd;
  for (let i = 0; i < numDays; i += 1) {
    out.push(cur);
    const [y, mo, day] = cur.split("-").map(Number);
    const x = new Date(Date.UTC(y, mo - 1, day));
    x.setUTCDate(x.getUTCDate() - 1);
    const yy = x.getUTCFullYear();
    const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(x.getUTCDate()).padStart(2, "0");
    cur = `${yy}-${mm}-${dd}`;
  }
  return out.reverse();
}

export async function buildStudyAnalyticsForUser(
  userId: string,
  opts?: { subjectId?: string | null }
) {
  const timeZone = getCalendarDefaultTimeZone();
  const now = new Date();

  const subjectFilter =
    opts?.subjectId && mongoose.Types.ObjectId.isValid(opts.subjectId)
      ? { subjectId: new mongoose.Types.ObjectId(opts.subjectId) }
      : {};

  const allSessions = await StudySessionModel.find({
    userId,
    ...subjectFilter
  })
    .select("durationMinutes endedAt subjectId")
    .lean();

  const endedAts = allSessions.map((s) => new Date(s.endedAt as Date));
  const daysSet = sessionDatesFromEndedAt(endedAts, timeZone);
  const currentStreak = computeCurrentStreak(daysSet, now, timeZone);
  const longestStreak = computeLongestStreak(daysSet);

  const totalMinutesAllTime = allSessions.reduce(
    (acc, s) => acc + (s.durationMinutes as number),
    0
  );

  const todayYmd = formatDateOnlyInTimeZone(now, timeZone);
  const weekDays = rollingDaysEndAt(todayYmd, 7);
  const minutesByDay = new Map<string, number>();
  for (const ymd of weekDays) {
    minutesByDay.set(ymd, 0);
  }
  for (const s of allSessions) {
    const ymd = formatDateOnlyInTimeZone(new Date(s.endedAt as Date), timeZone);
    if (minutesByDay.has(ymd)) {
      minutesByDay.set(
        ymd,
        (minutesByDay.get(ymd) ?? 0) + (s.durationMinutes as number)
      );
    }
  }

  const weeklyBar: WeeklyBarPoint[] = weekDays.map((ymd) => ({
    day: ymd,
    label: weekdayShort(ymd, timeZone),
    minutes: minutesByDay.get(ymd) ?? 0
  }));

  let weekTotal = 0;
  for (const ymd of weekDays) {
    weekTotal += minutesByDay.get(ymd) ?? 0;
  }

  const prevWeekStart = rollingDaysEndAt(
    (() => {
      const [y, mo, day] = weekDays[0].split("-").map(Number);
      const x = new Date(Date.UTC(y, mo - 1, day));
      x.setUTCDate(x.getUTCDate() - 1);
      const yy = x.getUTCFullYear();
      const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(x.getUTCDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    })(),
    7
  );
  let prevWeekTotal = 0;
  for (const s of allSessions) {
    const ymd = formatDateOnlyInTimeZone(new Date(s.endedAt as Date), timeZone);
    if (prevWeekStart.includes(ymd)) {
      prevWeekTotal += s.durationMinutes as number;
    }
  }

  const todayMinutes = minutesByDay.get(todayYmd) ?? 0;

  const dayCount = daysSet.size;
  const avgSession =
    allSessions.length > 0
      ? totalMinutesAllTime / allSessions.length
      : 0;

  const dailyAvgLast30 =
    dayCount > 0 ? totalMinutesAllTime / dayCount : 0;

  return {
    timeZone,
    currentStreak,
    longestStreak,
    totalMinutesAllTime,
    weekTotalMinutes: weekTotal,
    prevWeekTotalMinutes: prevWeekTotal,
    todayMinutes,
    weeklyBar,
    sessionCount: allSessions.length,
    avgSessionMinutes: avgSession,
    studyDayCount: dayCount,
    dailyAvgMinutes: dailyAvgLast30
  };
}
