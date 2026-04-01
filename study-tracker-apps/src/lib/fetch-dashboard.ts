/**
 * Fetches /api/dashboard with retries for cold starts (Vercel + Mongo) and transient errors.
 * First attempt has no delay; only failed attempts wait before retrying.
 */
export async function fetchDashboardWithRetry(): Promise<unknown> {
  const maxAttempts = 4;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delayMs = 180 * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delayMs));
    }
    try {
      const res = await fetch("/api/dashboard", {
        cache: "no-store",
        credentials: "same-origin"
      });
      if (res.ok) {
        return await res.json();
      }
      lastError = new Error(`HTTP ${res.status}`);
      const retryable =
        res.status >= 500 ||
        res.status === 429 ||
        res.status === 408 ||
        res.status === 503 ||
        (res.status === 401 && attempt < maxAttempts - 1);
      if (!retryable) {
        break;
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Could not load dashboard.");
}
