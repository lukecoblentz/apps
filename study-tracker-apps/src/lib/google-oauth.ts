type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export function getGoogleOAuthConfig(origin?: string) {
  const clientId = requiredEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requiredEnv("GOOGLE_CLIENT_SECRET");
  const baseOrigin = origin || process.env.NEXTAUTH_URL?.trim() || "";
  if (!process.env.GOOGLE_REDIRECT_URI?.trim() && !baseOrigin) {
    throw new Error("Set NEXTAUTH_URL or GOOGLE_REDIRECT_URI.");
  }
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${baseOrigin.replace(/\/$/, "")}/api/google/callback`;

  return { clientId, clientSecret, redirectUri };
}

export async function exchangeGoogleCodeForTokens(code: string, origin?: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(origin);
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token) {
    const detail = data.error_description || data.error || "Token exchange failed.";
    throw new Error(`Google token exchange failed: ${detail}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || "",
    expiresInSeconds: Number(data.expires_in || 0)
  };
}

export async function refreshGoogleAccessToken(refreshToken: string, origin?: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig(origin);
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token"
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token) {
    const detail = data.error_description || data.error || "Refresh failed.";
    throw new Error(`Google token refresh failed: ${detail}`);
  }

  return {
    accessToken: data.access_token,
    expiresInSeconds: Number(data.expires_in || 0)
  };
}
