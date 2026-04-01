import {
  addOneDayToYmd,
  formatDateOnlyInTimeZone,
  formatExactDueForDescription,
  getCalendarDefaultTimeZone,
  isEndOfDayStyleDeadline,
  withExactDuePreamble
} from "@/lib/calendar-due-display";

type PushParams = {
  accessToken: string;
  calendarId: string;
  title: string;
  description?: string;
  dueAt: Date;
  existingEventId?: string;
};

function calendarUrl(calendarId: string, eventId?: string) {
  const encodedCal = encodeURIComponent(calendarId);
  if (eventId) {
    return `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events/${encodeURIComponent(eventId)}`;
  }
  return `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events`;
}

export function parseGoogleCalendarApiError(body: unknown): string {
  if (!body || typeof body !== "object") return "Google Calendar API request failed";
  const err = (body as { error?: { message?: string; errors?: Array<{ message?: string }> } })
    .error;
  if (!err) return "Google Calendar API request failed";
  const nested = err.errors?.find((e) => typeof e?.message === "string")?.message;
  if (typeof nested === "string" && nested.length > 0) return nested;
  if (typeof err.message === "string" && err.message.length > 0) return err.message;
  return "Google Calendar API request failed";
}

export async function upsertGoogleCalendarEvent(params: PushParams) {
  const due = params.dueAt;
  if (Number.isNaN(due.getTime())) {
    throw new Error("Assignment has an invalid due date.");
  }

  const tz = getCalendarDefaultTimeZone();
  const exact = formatExactDueForDescription(due, tz);
  const allDay = isEndOfDayStyleDeadline(due, tz);
  const description = allDay
    ? withExactDuePreamble(params.description || "", exact)
    : params.description || "";

  let payload: Record<string, unknown>;

  if (allDay) {
    const dateStr = formatDateOnlyInTimeZone(due, tz);
    const endExclusive = addOneDayToYmd(dateStr);
    payload = {
      summary: params.title,
      description,
      start: { date: dateStr },
      end: { date: endExclusive }
    };
  } else {
    const end = new Date(due.getTime() + 60 * 60 * 1000);
    payload = {
      summary: params.title,
      description,
      start: { dateTime: due.toISOString() },
      end: { dateTime: end.toISOString() }
    };
  }

  const authHeaders = {
    Authorization: `Bearer ${params.accessToken}`,
    "Content-Type": "application/json"
  };

  const existingId = params.existingEventId?.trim();

  async function postEvent(): Promise<{ res: Response; body: unknown }> {
    const res = await fetch(calendarUrl(params.calendarId), {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload)
    });
    const body = await res.json().catch(() => ({}));
    return { res, body };
  }

  async function patchEvent(id: string): Promise<{ res: Response; body: unknown }> {
    const res = await fetch(calendarUrl(params.calendarId, id), {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify(payload)
    });
    const body = await res.json().catch(() => ({}));
    return { res, body };
  }

  let { res, body } =
    existingId && existingId.length > 0
      ? await patchEvent(existingId)
      : await postEvent();

  const patchRetryable =
    res.status === 400 ||
    res.status === 404 ||
    res.status === 409 ||
    res.status === 412;

  if (!res.ok && existingId && patchRetryable) {
    await fetch(calendarUrl(params.calendarId, existingId), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${params.accessToken}` }
    });
    const again = await postEvent();
    res = again.res;
    body = again.body;
  }

  if (!res.ok) {
    throw new Error(parseGoogleCalendarApiError(body));
  }

  if (typeof body !== "object" || body === null) {
    throw new Error("Google Calendar API did not return a body.");
  }

  const id = (body as { id?: string }).id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Google Calendar API did not return an event ID.");
  }

  return { eventId: id };
}
