import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/require-user";
import { AssignmentModel } from "@/models/Assignment";
import { pushAssignmentToGoogle } from "@/lib/google-sync";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const assignments = await AssignmentModel.find({ userId }).select("_id").lean();
  let successCount = 0;
  const failures: string[] = [];

  const rows = assignments as Array<{ _id: string }>;
  for (let i = 0; i < rows.length; i++) {
    const item = rows[i];
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 80));
    }
    try {
      await pushAssignmentToGoogle(userId, String(item._id), req.nextUrl.origin);
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
