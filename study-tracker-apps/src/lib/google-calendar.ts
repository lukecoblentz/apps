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

function url(calendarId: string, eventId?: string) {
  const encodedCal = encodeURIComponent(calendarId);
  if (eventId) {
    return `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events/${encodeURIComponent(eventId)}`;
  }
  return `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events`;
}

export async function upsertGoogleCalendarEvent(params: PushParams) {
  const due = params.dueAt;
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

  const method = params.existingEventId ? "PATCH" : "POST";
  const res = await fetch(url(params.calendarId, params.existingEventId), {
    method,
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof body?.error?.message === "string"
        ? body.error.message
        : "Google Calendar API request failed";
    throw new Error(msg);
  }

  if (typeof body?.id !== "string" || body.id.length === 0) {
    throw new Error("Google Calendar API did not return an event ID.");
  }

  return { eventId: body.id as string };
}
