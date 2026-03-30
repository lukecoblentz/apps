import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AssignmentModel } from "@/models/Assignment";
import { assignmentSchema } from "@/lib/validators/assignment";
import { getCurrentUserId } from "@/lib/require-user";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const assignments = await AssignmentModel.find({ userId })
    .populate("classId", "name color")
    .sort({ dueAt: 1 });

  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = assignmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const created = await AssignmentModel.create({
    ...parsed.data,
    dueAt: new Date(parsed.data.dueAt),
    userId,
    source: "manual"
  });

  return NextResponse.json(created, { status: 201 });
}
