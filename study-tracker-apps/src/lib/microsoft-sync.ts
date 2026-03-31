import { refreshMicrosoftAccessToken } from "@/lib/microsoft-oauth";
import { AssignmentModel } from "@/models/Assignment";
import { UserModel } from "@/models/User";

type MicrosoftUser = {
  msAccessToken?: string;
  msRefreshToken?: string;
  msTokenExpiresAt?: Date | string | null;
  msAutoSync?: boolean;
};

function graphEventUrl(eventId?: string) {
  if (eventId) {
    return `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`;
  }
  return "https://graph.microsoft.com/v1.0/me/events";
}

async function upsertMicrosoftCalendarEvent(params: {
  accessToken: string;
  title: string;
  description?: string;
  dueAt: Date;
  existingEventId?: string;
}) {
  const due = params.dueAt;
  const end = new Date(due.getTime() + 60 * 60 * 1000);
  const payload = {
    subject: params.title,
    body: {
      contentType: "text",
      content: params.description || ""
    },
    start: {
      dateTime: due.toISOString(),
      timeZone: "UTC"
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: "UTC"
    }
  };

  const method = params.existingEventId ? "PATCH" : "POST";
  const res = await fetch(graphEventUrl(params.existingEventId), {
    method,
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : "Microsoft Graph events request failed";
    throw new Error(message);
  }

  const eventId = body?.id || params.existingEventId;
  if (typeof eventId !== "string" || eventId.length === 0) {
    throw new Error("Microsoft Graph did not return an event ID.");
  }
  return { eventId };
}

export async function isMicrosoftAutoSyncEnabled(userId: string) {
  const rawUser = await UserModel.findOne({ _id: userId }).select("msAutoSync").lean();
  if (!rawUser) return false;
  const user = rawUser as { msAutoSync?: boolean };
  return Boolean(user.msAutoSync);
}

export async function getMicrosoftAuthForUser(userId: string, origin?: string) {
  const rawUser = await UserModel.findOne({ _id: userId }).lean();
  if (!rawUser) {
    throw new Error("User not found.");
  }

  const user = rawUser as MicrosoftUser;
  let token = user.msAccessToken?.trim() || "";
  const refreshToken = user.msRefreshToken?.trim() || "";
  const expiresAt = user.msTokenExpiresAt ? new Date(user.msTokenExpiresAt) : null;
  const autoSyncEnabled = Boolean(user.msAutoSync);

  if (!token && !refreshToken) {
    throw new Error("Connect Microsoft Calendar in Settings first.");
  }

  const needsRefresh =
    Boolean(refreshToken) && (!token || !expiresAt || expiresAt.getTime() <= Date.now() + 60_000);
  if (needsRefresh) {
    const refreshed = await refreshMicrosoftAccessToken(refreshToken, origin);
    token = refreshed.accessToken;
    const newExpiresAt =
      refreshed.expiresInSeconds > 0
        ? new Date(Date.now() + refreshed.expiresInSeconds * 1000)
        : new Date(Date.now() + 3600 * 1000);
    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        msAccessToken: token,
        msTokenExpiresAt: newExpiresAt
      }
    });
  }

  if (!token) {
    throw new Error("No usable Microsoft access token found. Reconnect in Settings.");
  }

  return { token, autoSyncEnabled };
}

export async function pushAssignmentToMicrosoft(userId: string, assignmentId: string, origin?: string) {
  const { token } = await getMicrosoftAuthForUser(userId, origin);
  const assignment = await AssignmentModel.findOne({ _id: assignmentId, userId })
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
    msEventId?: string;
  };
  const className = a.classId?.name ? `[${a.classId.name}] ` : "";
  const title = `${className}${a.title}`;

  const { eventId } = await upsertMicrosoftCalendarEvent({
    accessToken: token,
    title,
    description: a.description || "",
    dueAt: new Date(a.dueAt),
    existingEventId: a.msEventId || undefined
  });

  await AssignmentModel.findOneAndUpdate({ _id: assignmentId, userId }, { msEventId: eventId });
  return { eventId };
}
