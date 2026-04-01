import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/require-user";
import { SubjectModel } from "@/models/Subject";

const PALETTE = [
  "#4f46e5",
  "#0d9488",
  "#ca8a04",
  "#dc2626",
  "#7c3aed",
  "#2563eb",
  "#db2777",
  "#059669"
];

const postSchema = z.object({
  name: z.string().trim().min(1).max(120),
  color: z.string().trim().max(32).optional()
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const list = await SubjectModel.find({ userId })
    .sort({ sortOrder: 1, name: 1 })
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

  await connectToDatabase();
  const maxOrder = (await SubjectModel.findOne({ userId })
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean()) as { sortOrder?: number } | null;
  const sortOrder = (maxOrder?.sortOrder ?? 0) + 1;
  const color =
    parsed.data.color && parsed.data.color.length > 0
      ? parsed.data.color
      : PALETTE[sortOrder % PALETTE.length];

  try {
    const created = await SubjectModel.create({
      userId,
      name: parsed.data.name,
      color,
      sortOrder
    });
    return NextResponse.json(created);
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code;
    if (code === 11000) {
      return NextResponse.json(
        { error: "You already have a subject with that name." },
        { status: 409 }
      );
    }
    throw e;
  }
}
