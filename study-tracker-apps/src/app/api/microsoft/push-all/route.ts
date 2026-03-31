import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/require-user";
import { AssignmentModel } from "@/models/Assignment";
import { pushAssignmentToMicrosoft } from "@/lib/microsoft-sync";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const assignments = await AssignmentModel.find({ userId }).select("_id").lean();
  let successCount = 0;
  const failures: string[] = [];

  for (const item of assignments as Array<{ _id: string }>) {
    try {
      await pushAssignmentToMicrosoft(userId, String(item._id), req.nextUrl.origin);
      successCount += 1;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      failures.push(`${String(item._id)}: ${detail}`);
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    total: assignments.length,
    synced: successCount,
    failed: failures.length,
    failures
  });
}
