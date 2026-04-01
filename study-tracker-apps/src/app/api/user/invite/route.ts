import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { generateInviteCode } from "@/lib/invite-code";
import { getCurrentUserId } from "@/lib/require-user";
import { UserModel } from "@/models/User";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 8;

type InviteUserLean = { inviteCode?: string } | null;

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    let user = (await UserModel.findById(userId)
      .select("inviteCode")
      .lean()) as InviteUserLean;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.inviteCode) {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const code = generateInviteCode();
        try {
          await UserModel.updateOne(
            {
              _id: userId,
              $or: [
                { inviteCode: "" },
                { inviteCode: null },
                { inviteCode: { $exists: false } }
              ]
            },
            { $set: { inviteCode: code } }
          );
          const refreshed = (await UserModel.findById(userId)
            .select("inviteCode")
            .lean()) as InviteUserLean;
          if (refreshed?.inviteCode) {
            user = refreshed;
            break;
          }
        } catch {
          /* duplicate inviteCode */
        }
      }
    }

    const code = user.inviteCode;
    if (!code) {
      return NextResponse.json(
        { error: "Could not generate invite link. Try again." },
        { status: 500 }
      );
    }

    const origin =
      req.headers.get("x-forwarded-proto") && req.headers.get("x-forwarded-host")
        ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
        : new URL(req.url).origin;

    const inviteUrl = `${origin}/register?invite=${encodeURIComponent(code)}`;

    return NextResponse.json({ inviteCode: code, inviteUrl });
  } catch (error) {
    console.error("GET /api/user/invite failed", error);
    return NextResponse.json(
      { error: "Could not load invite link." },
      { status: 500 }
    );
  }
}
