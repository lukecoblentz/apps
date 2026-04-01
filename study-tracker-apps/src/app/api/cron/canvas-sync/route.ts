import { NextRequest, NextResponse } from "next/server";
import { syncCanvasForUser } from "@/lib/canvas-sync";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

/**
 * Vercel Cron: sync Canvas planner for every user with credentials.
 * Authorization: Bearer CRON_SECRET (same as reminders).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  await connectToDatabase();

  const users = await UserModel.find({
    canvasBaseUrl: { $regex: /^https:\/\/.+/i },
    canvasAccessToken: { $exists: true, $nin: [null, ""] }
  })
    .select("_id canvasBaseUrl canvasAccessToken")
    .lean();

  let ok = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const u of users) {
    const uid = String(u._id);
    const base = String(u.canvasBaseUrl || "").trim();
    const token = String(u.canvasAccessToken || "").trim();
    if (!base || !token) continue;

    try {
      await syncCanvasForUser(uid, base, token);
      await UserModel.findByIdAndUpdate(uid, {
        $set: {
          canvasLastSyncAt: new Date(),
          canvasLastSyncError: ""
        }
      });
      ok += 1;
    } catch (e) {
      failed += 1;
      const msg = e instanceof Error ? e.message : "Canvas sync failed";
      const short = msg.length > 400 ? `${msg.slice(0, 400)}…` : msg;
      await UserModel.findByIdAndUpdate(uid, {
        $set: { canvasLastSyncError: short }
      });
      if (errors.length < 5) {
        errors.push(`${uid}: ${short}`);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    usersConsidered: users.length,
    synced: ok,
    failed,
    sampleErrors: errors
  });
}
