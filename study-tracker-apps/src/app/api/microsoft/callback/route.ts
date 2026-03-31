import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { exchangeMicrosoftCodeForTokens } from "@/lib/microsoft-oauth";
import { getCurrentUserId } from "@/lib/require-user";
import { UserModel } from "@/models/User";

function settingsErrorUrl(origin: string, detail: string) {
  const u = new URL("/settings", origin);
  u.searchParams.set("ms", "error");
  const short = detail.slice(0, 800);
  u.searchParams.set("detail", short);
  return u;
}

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  const oauthErr = req.nextUrl.searchParams.get("error");
  const oauthDesc = req.nextUrl.searchParams.get("error_description") || "";
  if (oauthErr) {
    const detail = oauthDesc || oauthErr;
    return NextResponse.redirect(settingsErrorUrl(req.nextUrl.origin, detail));
  }

  const code = req.nextUrl.searchParams.get("code") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  if (!code || !state) {
    return NextResponse.redirect(
      settingsErrorUrl(req.nextUrl.origin, "Missing code or state from Microsoft.")
    );
  }

  await connectToDatabase();
  const rawUser = await UserModel.findOne({ _id: userId }).lean();
  const user = rawUser as {
    msOAuthState?: string;
    msOAuthStateExpiresAt?: Date | string | null;
  } | null;
  if (!user) {
    return NextResponse.redirect(
      settingsErrorUrl(req.nextUrl.origin, "User not found for OAuth state.")
    );
  }

  const expectedState = user.msOAuthState || "";
  const expiresAt = user.msOAuthStateExpiresAt ? new Date(user.msOAuthStateExpiresAt) : null;
  if (!expectedState || state !== expectedState || !expiresAt || expiresAt.getTime() < Date.now()) {
    return NextResponse.redirect(
      settingsErrorUrl(
        req.nextUrl.origin,
        "Invalid or expired sign-in session. Try Connect Outlook again."
      )
    );
  }

  try {
    const tokens = await exchangeMicrosoftCodeForTokens(code, req.nextUrl.origin);
    const expiresAtMs =
      tokens.expiresInSeconds > 0 ? Date.now() + tokens.expiresInSeconds * 1000 : Date.now();

    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        msAccessToken: tokens.accessToken,
        msTokenExpiresAt: new Date(expiresAtMs),
        ...(tokens.refreshToken ? { msRefreshToken: tokens.refreshToken } : {})
      },
      $unset: {
        msOAuthState: "",
        msOAuthStateExpiresAt: ""
      }
    });
    return NextResponse.redirect(new URL("/settings?ms=connected", req.nextUrl.origin));
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Token exchange failed.";
    console.error("Microsoft OAuth callback", err);
    await UserModel.findByIdAndUpdate(userId, {
      $unset: {
        msOAuthState: "",
        msOAuthStateExpiresAt: ""
      }
    });
    return NextResponse.redirect(settingsErrorUrl(req.nextUrl.origin, detail));
  }
}
