import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/require-user";
import { UserModel } from "@/models/User";

const patchSchema = z
  .object({
    reminderMinutesBefore: z
      .array(z.number().int().min(1).max(10080))
      .max(10)
      .optional(),
    canvasBaseUrl: z.string().max(500).optional(),
    canvasAccessToken: z.string().max(20000).optional()
  })
  .strict();

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const raw = await UserModel.findOne({ _id: userId }).lean();
  if (!raw) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const user = raw as {
    reminderMinutesBefore?: number[];
    canvasBaseUrl?: string;
    canvasAccessToken?: string;
  };
  const reminders = user.reminderMinutesBefore;
  return NextResponse.json({
    reminderMinutesBefore:
      reminders && reminders.length > 0 ? reminders : [1440, 120],
    canvasBaseUrl: user.canvasBaseUrl || "",
    hasCanvasToken: Boolean(user.canvasAccessToken)
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (
    parsed.data.canvasBaseUrl !== undefined &&
    parsed.data.canvasBaseUrl !== "" &&
    !/^https:\/\/.+/i.test(parsed.data.canvasBaseUrl)
  ) {
    return NextResponse.json(
      { error: "Canvas base URL must be https or empty." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const $set: Record<string, unknown> = {};
  if (parsed.data.reminderMinutesBefore != null) {
    $set.reminderMinutesBefore = parsed.data.reminderMinutesBefore;
  }
  if (parsed.data.canvasBaseUrl !== undefined) {
    $set.canvasBaseUrl = parsed.data.canvasBaseUrl;
  }
  if (parsed.data.canvasAccessToken !== undefined) {
    if (parsed.data.canvasAccessToken === "") {
      $set.canvasAccessToken = "";
    } else {
      $set.canvasAccessToken = parsed.data.canvasAccessToken;
    }
  }

  if (Object.keys($set).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await UserModel.findByIdAndUpdate(userId, { $set });

  return NextResponse.json({ ok: true });
}
