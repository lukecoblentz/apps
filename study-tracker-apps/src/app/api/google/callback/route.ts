import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { exchangeGoogleCodeForTokens } from "@/lib/google-oauth";
import { getCurrentUserId } from "@/lib/require-user";
import { UserModel } from "@/models/User";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  const code = req.nextUrl.searchParams.get("code") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?google=error", req.nextUrl.origin));
  }

  await connectToDatabase();
  const rawUser = await UserModel.findOne({ _id: userId }).lean();
  const user = rawUser as {
    googleOAuthState?: string;
    googleOAuthStateExpiresAt?: Date | string | null;
  } | null;
  if (!user) {
    return NextResponse.redirect(new URL("/settings?google=error", req.nextUrl.origin));
  }

  const expectedState = user.googleOAuthState || "";
  const expiresAt = user.googleOAuthStateExpiresAt
    ? new Date(user.googleOAuthStateExpiresAt)
    : null;

  if (!expectedState || state !== expectedState || !expiresAt || expiresAt.getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/settings?google=error", req.nextUrl.origin));
  }

  try {
    const tokens = await exchangeGoogleCodeForTokens(code, req.nextUrl.origin);
    const expiresAtMs =
      tokens.expiresInSeconds > 0 ? Date.now() + tokens.expiresInSeconds * 1000 : Date.now();

    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        googleAccessToken: tokens.accessToken,
        googleTokenExpiresAt: new Date(expiresAtMs),
        ...(tokens.refreshToken ? { googleRefreshToken: tokens.refreshToken } : {})
      },
      $unset: {
        googleOAuthState: "",
        googleOAuthStateExpiresAt: ""
      }
    });

    return NextResponse.redirect(new URL("/settings?google=connected", req.nextUrl.origin));
  } catch {
    await UserModel.findByIdAndUpdate(userId, {
      $unset: {
        googleOAuthState: "",
        googleOAuthStateExpiresAt: ""
      }
    });
    return NextResponse.redirect(new URL("/settings?google=error", req.nextUrl.origin));
  }
}
