/**
 * Shared rules for turning assignment dueAt into calendar events.
 * End-of-day deadlines (typical 11:59 PM) sync as all-day events so they stay
 * readable in week view; the precise date/time is kept in the event description.
 */

const FALLBACK_TZ = "America/New_York";

function isValidIanaTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/** IANA zone used to interpret due times when building calendar dates (set in env for your region). */
export function getCalendarDefaultTimeZone(): string {
  const raw = process.env.CALENDAR_DEFAULT_TIMEZONE?.trim();
  const candidate = raw && raw.length > 0 ? raw : FALLBACK_TZ;
  return isValidIanaTimeZone(candidate) ? candidate : FALLBACK_TZ;
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
  try {
    const { hour, minute } = getLocalHourMinute(d, timeZone);
    return hour === 23 && minute >= 58;
  } catch {
    return false;
  }
}

/** YYYY-MM-DD for the calendar date containing `d` in `timeZone`. */
export function formatDateOnlyInTimeZone(d: Date, timeZone: string): string {
  try {
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
  } catch {
    return d.toISOString().slice(0, 10);
  }
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

/** True if `ymd` is a Sunday in `timeZone`. */
export function isSundayYmd(ymd: string, timeZone: string): boolean {
  const [y, m, d] = ymd.split("-").map(Number);
  const anchor = Date.UTC(y, m - 1, d, 12, 0, 0);
  for (let i = 0; i < 60 * 24 * 2; i++) {
    const ms = anchor - 24 * 3600000 + i * 60 * 1000;
    if (formatDateOnlyInTimeZone(new Date(ms), timeZone) !== ymd) continue;
    const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(
      new Date(ms)
    );
    return wd.startsWith("Sun");
  }
  return false;
}

/**
 * Last instant (23:59:59.999) of calendar day `dateYmd` in `timeZone`, as a UTC Date for queries.
 */
export function endOfCalendarDayInTimeZone(dateYmd: string, timeZone: string): Date {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const anchor = Date.UTC(y, m - 1, d, 12, 0, 0);
  const startScan = anchor - 48 * 3600000;
  let lastMs: number | null = null;
  for (let i = 0; i < 60 * 24 * 4; i++) {
    const ms = startScan + i * 60 * 1000;
    if (formatDateOnlyInTimeZone(new Date(ms), timeZone) === dateYmd) {
      lastMs = ms;
    }
  }
  if (lastMs === null) {
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }
  return new Date(lastMs + 59 * 1000 + 999);
}

/**
 * End of the upcoming Sunday (11:59:59.999 PM) that closes the week containing `from`,
 * using the same week boundaries as a typical Mon–Sun school week (Sunday is the last day).
 */
export function endOfUpcomingSundayNight(from: Date, timeZone: string): Date {
  let ymd = formatDateOnlyInTimeZone(from, timeZone);
  for (let i = 0; i < 7; i++) {
    if (isSundayYmd(ymd, timeZone)) {
      return endOfCalendarDayInTimeZone(ymd, timeZone);
    }
    ymd = addOneDayToYmd(ymd);
  }
  return endOfCalendarDayInTimeZone(ymd, timeZone);
}
