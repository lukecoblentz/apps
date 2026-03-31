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

export function getMicrosoftOAuthConfig(origin?: string) {
  const clientId = requiredEnv("MICROSOFT_CLIENT_ID");
  const clientSecret = requiredEnv("MICROSOFT_CLIENT_SECRET");
  const baseOrigin = origin || process.env.NEXTAUTH_URL?.trim() || "";
  if (!process.env.MICROSOFT_REDIRECT_URI?.trim() && !baseOrigin) {
    throw new Error("Set NEXTAUTH_URL or MICROSOFT_REDIRECT_URI.");
  }
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI?.trim() ||
    `${baseOrigin.replace(/\/$/, "")}/api/microsoft/callback`;

  return { clientId, clientSecret, redirectUri };
}

/** Scopes must match authorize request; use Graph resource URI for calendar. */
export const MICROSOFT_OAUTH_SCOPES =
  "openid profile email offline_access https://graph.microsoft.com/Calendars.ReadWrite";

export async function exchangeMicrosoftCodeForTokens(code: string, origin?: string) {
  const { clientId, clientSecret, redirectUri } = getMicrosoftOAuthConfig(origin);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: MICROSOFT_OAUTH_SCOPES
  });

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token) {
    const detail = data.error_description || data.error || "Token exchange failed.";
    throw new Error(`Microsoft token exchange failed: ${detail}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || "",
    expiresInSeconds: Number(data.expires_in || 0)
  };
}

export async function refreshMicrosoftAccessToken(refreshToken: string, origin?: string) {
  const { clientId, clientSecret, redirectUri } = getMicrosoftOAuthConfig(origin);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    redirect_uri: redirectUri,
    grant_type: "refresh_token",
    scope: MICROSOFT_OAUTH_SCOPES
  });

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token) {
    const detail = data.error_description || data.error || "Refresh failed.";
    throw new Error(`Microsoft token refresh failed: ${detail}`);
  }

  return {
    accessToken: data.access_token,
    expiresInSeconds: Number(data.expires_in || 0)
  };
}
