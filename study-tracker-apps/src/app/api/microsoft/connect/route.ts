import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getMicrosoftOAuthConfig, MICROSOFT_OAUTH_SCOPES } from "@/lib/microsoft-oauth";
import { getCurrentUserId } from "@/lib/require-user";
import { UserModel } from "@/models/User";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  try {
    const { clientId, redirectUri } = getMicrosoftOAuthConfig(req.nextUrl.origin);
    const state = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await connectToDatabase();
    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        msOAuthState: state,
        msOAuthStateExpiresAt: expiresAt
      }
    });

    const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", MICROSOFT_OAUTH_SCOPES);
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");

    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Microsoft OAuth config error.";
    const failUrl = new URL("/settings", req.nextUrl.origin);
    failUrl.searchParams.set("ms", "error");
    failUrl.searchParams.set("detail", message);
    return NextResponse.redirect(failUrl);
  }
}
