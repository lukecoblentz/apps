import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AssignmentModel } from "@/models/Assignment";
import { ClassModel } from "@/models/Class";
import { classSchema } from "@/lib/validators/class";
import { getCurrentUserId } from "@/lib/require-user";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = classSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const updated = await ClassModel.findOneAndUpdate(
    { _id: params.id, userId },
    parsed.data,
    { new: true }
  );

  if (!updated) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
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
  const existing = await ClassModel.findOne({ _id: params.id, userId });
  if (!existing) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  await AssignmentModel.deleteMany({ userId, classId: params.id });
  await ClassModel.deleteOne({ _id: params.id, userId });

  return NextResponse.json({ ok: true });
}
