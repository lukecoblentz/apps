import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { listGoogleCalendarsForUser } from "@/lib/google-sync";
import { getCurrentUserId } from "@/lib/require-user";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  try {
    const calendars = await listGoogleCalendarsForUser(userId, req.nextUrl.origin);
    return NextResponse.json({ calendars });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown Google error";
    return NextResponse.json(
      { error: `Could not load Google calendars: ${detail}` },
      { status: 502 }
    );
  }
}
