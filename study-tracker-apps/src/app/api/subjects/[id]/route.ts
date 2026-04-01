import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/require-user";
import { StudySessionModel } from "@/models/StudySession";
import { SubjectModel } from "@/models/Subject";

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    color: z.string().trim().min(1).max(32).optional(),
    sortOrder: z.number().int().optional()
  })
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const updated = await SubjectModel.findOneAndUpdate(
    { _id: id, userId },
    { $set: parsed.data },
    { new: true }
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await connectToDatabase();
  const sub = await SubjectModel.findOne({ _id: id, userId }).lean();
  if (!sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await StudySessionModel.updateMany(
    { userId, subjectId: new mongoose.Types.ObjectId(id) },
    { $set: { subjectId: null } }
  );
  await SubjectModel.deleteOne({ _id: id, userId });

  return NextResponse.json({ ok: true });
}
