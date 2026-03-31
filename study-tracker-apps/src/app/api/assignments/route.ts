import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AssignmentModel } from "@/models/Assignment";
import { ClassModel } from "@/models/Class";
import { assignmentSchema } from "@/lib/validators/assignment";
import { getCurrentUserId } from "@/lib/require-user";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const assignments = await AssignmentModel.find({ userId })
      .populate("classId", "name color")
      .sort({ dueAt: 1 });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("GET /api/assignments failed", error);
    return NextResponse.json(
      { error: "Could not load assignments." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = assignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid assignment input." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const owningClass = await ClassModel.findOne({
      _id: parsed.data.classId,
      userId
    }).lean();

    if (!owningClass) {
      return NextResponse.json(
        { error: "Selected class not found for your account." },
        { status: 400 }
      );
    }

    const created = await AssignmentModel.create({
      ...parsed.data,
      dueAt: new Date(parsed.data.dueAt),
      userId,
      source: "manual"
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/assignments failed", error);
    return NextResponse.json(
      { error: "Server failed to add assignment. Please refresh and retry." },
      { status: 500 }
    );
  }
}
