import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { upsertGoogleCalendarEvent } from "@/lib/google-calendar";
import { getCurrentUserId } from "@/lib/require-user";
import { AssignmentModel } from "@/models/Assignment";
import { UserModel } from "@/models/User";

const schema = z.object({
  assignmentId: z.string().min(1)
});

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid assignment id." }, { status: 400 });
  }

  await connectToDatabase();
  const rawUser = await UserModel.findOne({ _id: userId }).lean();
  if (!rawUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  const user = rawUser as { googleAccessToken?: string; googleCalendarId?: string };
  const token = user.googleAccessToken?.trim() || "";
  const calendarId = user.googleCalendarId?.trim() || "primary";

  if (!token) {
    return NextResponse.json(
      { error: "Add Google access token in Settings first." },
      { status: 400 }
    );
  }

  const assignment = await AssignmentModel.findOne({
    _id: parsed.data.assignmentId,
    userId
  })
    .populate("classId", "name")
    .lean();

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const a = assignment as unknown as {
    _id: string;
    title: string;
    description?: string;
    dueAt: Date;
    classId?: { name?: string } | null;
    googleEventId?: string;
  };
  const className = a.classId?.name ? `[${a.classId.name}] ` : "";
  const title = `${className}${a.title}`;

  try {
    const { eventId } = await upsertGoogleCalendarEvent({
      accessToken: token,
      calendarId,
      title,
      description: a.description || "",
      dueAt: new Date(a.dueAt),
      existingEventId: a.googleEventId || undefined
    });

    await AssignmentModel.findOneAndUpdate(
      { _id: parsed.data.assignmentId, userId },
      { googleEventId: eventId }
    );

    return NextResponse.json({ ok: true, googleEventId: eventId });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown Google error";
    return NextResponse.json(
      { error: `Google push failed: ${detail}` },
      { status: 502 }
    );
  }
}
