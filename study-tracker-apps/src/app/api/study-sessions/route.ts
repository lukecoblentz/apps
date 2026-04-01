import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/require-user";
import { StudySessionModel } from "@/models/StudySession";
import { SubjectModel } from "@/models/Subject";

const postSchema = z.object({
  durationMinutes: z.number().int().min(1).max(1440),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  source: z.enum(["timer", "manual"]).optional(),
  subjectId: z.string().optional().nullable()
});

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "30", 10) || 30)
  );

  await connectToDatabase();
  const q: Record<string, unknown> = { userId };
  if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
    q.subjectId = new mongoose.Types.ObjectId(subjectId);
  }

  const list = await StudySessionModel.find(q)
    .populate("subjectId", "name color")
    .sort({ endedAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const start = new Date(parsed.data.startedAt);
  const end = new Date(parsed.data.endedAt);
  if (end.getTime() < start.getTime()) {
    return NextResponse.json(
      { error: "endedAt must be after startedAt." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  let subjectId: mongoose.Types.ObjectId | null = null;
  if (parsed.data.subjectId && mongoose.Types.ObjectId.isValid(parsed.data.subjectId)) {
    const sub = await SubjectModel.findOne({
      _id: parsed.data.subjectId,
      userId
    }).lean();
    if (!sub) {
      return NextResponse.json({ error: "Subject not found." }, { status: 400 });
    }
    subjectId = new mongoose.Types.ObjectId(parsed.data.subjectId);
  }

  const created = await StudySessionModel.create({
    userId,
    subjectId,
    durationMinutes: parsed.data.durationMinutes,
    startedAt: start,
    endedAt: end,
    source: parsed.data.source ?? "timer"
  });

  const populated = await StudySessionModel.findById(created._id)
    .populate("subjectId", "name color")
    .lean();

  return NextResponse.json(populated);
}
