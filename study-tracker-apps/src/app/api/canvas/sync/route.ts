import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/require-user";
import { syncCanvasForUser } from "@/lib/canvas-sync";
import { UserModel } from "@/models/User";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const user = await UserModel.findOne({ _id: userId }).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const u = user as {
    canvasBaseUrl?: string;
    canvasAccessToken?: string;
  };
  const base = u.canvasBaseUrl?.trim() || "";
  const token = u.canvasAccessToken?.trim() || "";
  if (!base || !token) {
    return NextResponse.json(
      { error: "Save your Canvas base URL and access token in Settings first." },
      { status: 400 }
    );
  }

  try {
    const result = await syncCanvasForUser(userId, base, token);
    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        canvasLastSyncAt: new Date(),
        canvasLastSyncError: ""
      }
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("Canvas sync failed", e);
    const message = e instanceof Error ? e.message : "Canvas sync failed";
    const short =
      message.length > 400 ? `${message.slice(0, 400)}…` : message;
    await UserModel.findByIdAndUpdate(userId, {
      $set: { canvasLastSyncError: short }
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
