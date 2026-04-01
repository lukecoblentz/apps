/**
 * Shared rules for turning assignment dueAt into calendar events.
 * End-of-day deadlines (typical 11:59 PM) sync as all-day events so they stay
 * readable in week view; the precise date/time is kept in the event description.
 */

/** IANA zone used to interpret due times when building calendar dates (set in env for your region). */
export function getCalendarDefaultTimeZone(): string {
  const raw = process.env.CALENDAR_DEFAULT_TIMEZONE?.trim();
  return raw && raw.length > 0 ? raw : "America/New_York";
}

export function getLocalHourMinute(d: Date, timeZone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(d);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return { hour, minute };
}

/**
 * True when the due instant falls in the last ~2 minutes of that calendar day in `timeZone`
 * (typical Canvas / LMS "due 11:59 PM" behavior).
 */
export function isEndOfDayStyleDeadline(d: Date, timeZone: string): boolean {
  const { hour, minute } = getLocalHourMinute(d, timeZone);
  return hour === 23 && minute >= 58;
}

/** YYYY-MM-DD for the calendar date containing `d` in `timeZone`. */
export function formatDateOnlyInTimeZone(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !day) return d.toISOString().slice(0, 10);
  return `${y}-${m}-${day}`;
}

/** Next calendar day after YYYY-MM-DD (Gregorian). */
export function addOneDayToYmd(ymd: string): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const x = new Date(Date.UTC(y, mo - 1, d));
  x.setUTCDate(x.getUTCDate() + 1);
  const yy = x.getUTCFullYear();
  const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(x.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Human-readable exact due for event description (timezone-aware). */
export function formatExactDueForDescription(d: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

/** Prefix description with exact deadline when we use an all-day calendar block. */
export function withExactDuePreamble(description: string, exactLine: string): string {
  const line = `Exact deadline: ${exactLine}`;
  const trimmed = description.trim();
  return trimmed ? `${line}\n\n${trimmed}` : line;
}
