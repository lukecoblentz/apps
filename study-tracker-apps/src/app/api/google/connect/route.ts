import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getGoogleOAuthConfig } from "@/lib/google-oauth";
import { getCurrentUserId } from "@/lib/require-user";
import { UserModel } from "@/models/User";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  try {
    const { clientId, redirectUri } = getGoogleOAuthConfig(req.nextUrl.origin);
    const state = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await connectToDatabase();
    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        googleOAuthState: state,
        googleOAuthStateExpiresAt: expiresAt
      }
    });

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly"
      ].join(" ")
    );
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    url.searchParams.set("include_granted_scopes", "true");

    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google OAuth config error.";
    const failUrl = new URL("/settings", req.nextUrl.origin);
    failUrl.searchParams.set("google", "error");
    failUrl.searchParams.set("detail", message);
    return NextResponse.redirect(failUrl);
  }
}
