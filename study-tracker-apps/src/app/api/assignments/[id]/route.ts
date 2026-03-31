import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AssignmentModel } from "@/models/Assignment";
import { getCurrentUserId } from "@/lib/require-user";
import { assignmentPatchSchema } from "@/lib/validators/assignment-patch";
import { isGoogleAutoSyncEnabled, pushAssignmentToGoogle } from "@/lib/google-sync";
import {
  isMicrosoftAutoSyncEnabled,
  pushAssignmentToMicrosoft
} from "@/lib/microsoft-sync";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = assignmentPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const update: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.description !== undefined) {
    update.description = parsed.data.description;
  }
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.classId !== undefined) update.classId = parsed.data.classId;
  if (parsed.data.dueAt !== undefined) update.dueAt = new Date(parsed.data.dueAt);

  const updated = await AssignmentModel.findOneAndUpdate(
    { _id: params.id, userId },
    update,
    { new: true }
  ).populate("classId", "name color");

  if (!updated) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  if (
    parsed.data.title !== undefined ||
    parsed.data.description !== undefined ||
    parsed.data.classId !== undefined ||
    parsed.data.dueAt !== undefined
  ) {
    try {
      const autoSyncEnabled = await isGoogleAutoSyncEnabled(userId);
      if (autoSyncEnabled) {
        await pushAssignmentToGoogle(userId, params.id, req.nextUrl.origin);
      }
    } catch (error) {
      console.error("PATCH /api/assignments/[id] auto Google sync skipped", error);
    }
    try {
      const autoSyncEnabled = await isMicrosoftAutoSyncEnabled(userId);
      if (autoSyncEnabled) {
        await pushAssignmentToMicrosoft(userId, params.id, req.nextUrl.origin);
      }
    } catch (error) {
      console.error("PATCH /api/assignments/[id] auto Microsoft sync skipped", error);
    }
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

  await connectToDatabase();
  const deleted = await AssignmentModel.findOneAndDelete({
    _id: params.id,
    userId
  });

  if (!deleted) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
