import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { listMicrosoftCalendarsForUser } from "@/lib/microsoft-sync";
import { getCurrentUserId } from "@/lib/require-user";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  try {
    const calendars = await listMicrosoftCalendarsForUser(userId, req.nextUrl.origin);
    return NextResponse.json({ calendars });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown Microsoft error";
    return NextResponse.json(
      { error: `Could not load Outlook calendars: ${detail}` },
      { status: 502 }
    );
  }
}
