import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ClassModel } from "@/models/Class";
import { classSchema } from "@/lib/validators/class";
import { getCurrentUserId } from "@/lib/require-user";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const classes = await ClassModel.find({ userId }).sort({
      createdAt: -1
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error("GET /api/classes failed", error);
    return NextResponse.json(
      { error: "Failed to load classes. Check MONGODB_URI connection." },
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
    const parsed = classSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const created = await ClassModel.create({
      ...parsed.data,
      userId
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/classes failed", error);
    return NextResponse.json(
      { error: "Failed to create class. Check MONGODB_URI and request data." },
      { status: 500 }
    );
  }
}
