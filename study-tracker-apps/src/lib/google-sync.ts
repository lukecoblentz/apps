import { refreshGoogleAccessToken } from "@/lib/google-oauth";
import { upsertGoogleCalendarEvent } from "@/lib/google-calendar";
import { AssignmentModel } from "@/models/Assignment";
import { UserModel } from "@/models/User";

type GoogleUser = {
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleTokenExpiresAt?: Date | string | null;
  googleCalendarId?: string;
  googleAutoSync?: boolean;
};

export async function isGoogleAutoSyncEnabled(userId: string) {
  const rawUser = await UserModel.findOne({ _id: userId })
    .select("googleAutoSync")
    .lean();
  if (!rawUser) return false;
  const user = rawUser as { googleAutoSync?: boolean };
  return Boolean(user.googleAutoSync);
}

export async function getGoogleAuthForUser(userId: string, origin?: string) {
  const rawUser = await UserModel.findOne({ _id: userId }).lean();
  if (!rawUser) {
    throw new Error("User not found.");
  }

  const user = rawUser as GoogleUser;
  let token = user.googleAccessToken?.trim() || "";
  const refreshToken = user.googleRefreshToken?.trim() || "";
  const expiresAt = user.googleTokenExpiresAt ? new Date(user.googleTokenExpiresAt) : null;
  const calendarId = user.googleCalendarId?.trim() || "primary";
  const autoSyncEnabled = Boolean(user.googleAutoSync);

  if (!token && !refreshToken) {
    throw new Error("Connect Google Calendar in Settings first.");
  }

  const needsRefresh =
    Boolean(refreshToken) && (!token || !expiresAt || expiresAt.getTime() <= Date.now() + 60_000);
  if (needsRefresh) {
    const refreshed = await refreshGoogleAccessToken(refreshToken, origin);
    token = refreshed.accessToken;
    const newExpiresAt =
      refreshed.expiresInSeconds > 0
        ? new Date(Date.now() + refreshed.expiresInSeconds * 1000)
        : new Date(Date.now() + 3600 * 1000);
    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        googleAccessToken: token,
        googleTokenExpiresAt: newExpiresAt
      }
    });
  }

  if (!token) {
    throw new Error("No usable Google access token found. Reconnect in Settings.");
  }

  return { token, calendarId, autoSyncEnabled };
}

export async function listGoogleCalendarsForUser(userId: string, origin?: string) {
  const { token } = await getGoogleAuthForUser(userId, origin);
  const listUrl = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
  listUrl.searchParams.set("minAccessRole", "writer");

  const res = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof body?.error?.message === "string"
        ? body.error.message
        : "Google Calendar list request failed";
    throw new Error(msg);
  }
  const items = Array.isArray(body?.items) ? body.items : [];
  return items
    .map((c: { id?: string; summary?: string }) => ({
      id: typeof c.id === "string" ? c.id : "",
      name: typeof c.summary === "string" ? c.summary : "Calendar"
    }))
    .filter((c: { id: string }) => c.id.length > 0);
}

export async function pushAssignmentToGoogle(userId: string, assignmentId: string, origin?: string) {
  const { token, calendarId } = await getGoogleAuthForUser(userId, origin);
  const assignment = await AssignmentModel.findOne({
    _id: assignmentId,
    userId
  })
    .populate("classId", "name")
    .lean();

  if (!assignment) {
    throw new Error("Assignment not found.");
  }

  const a = assignment as unknown as {
    title: string;
    description?: string;
    dueAt: Date;
    classId?: { name?: string } | null;
    googleEventId?: string;
  };
  const className = a.classId?.name ? `[${a.classId.name}] ` : "";
  const title = `${className}${a.title}`;

  const { eventId } = await upsertGoogleCalendarEvent({
    accessToken: token,
    calendarId,
    title,
    description: a.description || "",
    dueAt: new Date(a.dueAt),
    existingEventId: a.googleEventId || undefined
  });

  await AssignmentModel.findOneAndUpdate({ _id: assignmentId, userId }, { googleEventId: eventId });
  return { eventId };
}
