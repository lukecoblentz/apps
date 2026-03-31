import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { pushAssignmentToMicrosoft } from "@/lib/microsoft-sync";
import { getCurrentUserId } from "@/lib/require-user";

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
  try {
    const { eventId } = await pushAssignmentToMicrosoft(
      userId,
      parsed.data.assignmentId,
      req.nextUrl.origin
    );
    return NextResponse.json({ ok: true, msEventId: eventId });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown Microsoft error";
    return NextResponse.json(
      { error: `Microsoft push failed: ${detail}` },
      { status: 502 }
    );
  }
}
