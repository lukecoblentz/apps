import type { WeeklyBarPoint } from "@/lib/study-analytics";

export type DayOfWeekAgg = { weekday: string; minutes: number };

export function buildInsightLines(input: {
  weekHours: number;
  prevWeekHours: number;
  mostActiveWeekday: DayOfWeekAgg | null;
  mostSessionsWeekday: { weekday: string; sessions: number } | null;
  avgSessionMinutes: number;
}): string[] {
  const lines: string[] = [];
  const w = input.weekHours;
  lines.push(
    w >= 1
      ? `You studied about ${w.toFixed(1)} hours this week.`
      : `You logged ${Math.round(w * 60)} minutes of study this week.`
  );

  if (input.mostActiveWeekday && input.mostActiveWeekday.minutes > 0) {
    lines.push(
      `Your most active day is ${input.mostActiveWeekday.weekday} (by total time in the last week).`
    );
  }

  if (input.avgSessionMinutes > 0) {
    lines.push(
      `Your average session length is about ${Math.round(input.avgSessionMinutes)} minutes.`
    );
  }

  if (input.mostSessionsWeekday && input.mostSessionsWeekday.sessions > 0) {
    lines.push(
      `You log the most sessions on ${input.mostSessionsWeekday.weekday}.`
    );
  }

  const cur = input.weekHours;
  const prev = input.prevWeekHours;
  if (prev > 0.05) {
    const pct = ((cur - prev) / prev) * 100;
    if (pct > 5) {
      lines.push(
        `Nice — your study time is up about ${Math.round(pct)}% compared to last week.`
      );
    } else if (pct < -5) {
      lines.push(
        `Study time is down about ${Math.round(Math.abs(pct))}% vs last week — small steps still count.`
      );
    }
  }

  return lines;
}

/** Aggregate minutes by weekday name (long) in `timeZone` from weekly bar + full history approximation. */
export function mostActiveDayFromWeeklyBar(
  weeklyBar: WeeklyBarPoint[],
  timeZone: string
): DayOfWeekAgg | null {
  let best: DayOfWeekAgg | null = null;
  for (const row of weeklyBar) {
    const [y, m, d] = row.day.split("-").map(Number);
    const utc = Date.UTC(y, m - 1, d, 12, 0, 0);
    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone
    }).format(new Date(utc));
    if (!best || row.minutes > best.minutes) {
      best = { weekday, minutes: row.minutes };
    }
  }
  return best && best.minutes > 0 ? best : null;
}
