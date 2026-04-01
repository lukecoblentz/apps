"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const REMINDER_PRESETS: { label: string; minutes: number }[] = [
  { label: "1 day before", minutes: 1440 },
  { label: "12 hours before", minutes: 720 },
  { label: "2 hours before", minutes: 120 },
  { label: "1 hour before", minutes: 60 }
];

export default function SettingsPage() {
  const [canvasBaseUrl, setCanvasBaseUrl] = useState("");
  const [canvasTokenInput, setCanvasTokenInput] = useState("");
  const [hasCanvasToken, setHasCanvasToken] = useState(false);
  const [googleCalendarId, setGoogleCalendarId] = useState("primary");
  const [googleCalendars, setGoogleCalendars] = useState<{ id: string; name: string }[]>([]);
  const [googleCalendarsLoading, setGoogleCalendarsLoading] = useState(false);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const [googleAutoSync, setGoogleAutoSync] = useState(false);
  const [hasMicrosoftToken, setHasMicrosoftToken] = useState(false);
  const [msCalendarId, setMsCalendarId] = useState("");
  const [msCalendars, setMsCalendars] = useState<{ id: string; name: string }[]>([]);
  const [msCalendarsLoading, setMsCalendarsLoading] = useState(false);
  const [msAutoSync, setMsAutoSync] = useState(false);
  const [reminderSet, setReminderSet] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [canvasLastSyncAt, setCanvasLastSyncAt] = useState<string | null>(null);
  const [canvasLastSyncError, setCanvasLastSyncError] = useState("");
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(120);
  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useState(600);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [msConnecting, setMsConnecting] = useState(false);
  const searchParams = useSearchParams();

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load settings.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setCanvasBaseUrl(data.canvasBaseUrl || "");
    setHasCanvasToken(Boolean(data.hasCanvasToken));
    setHasGoogleToken(Boolean(data.hasGoogleToken));
    setGoogleCalendarId(data.googleCalendarId || "primary");
    setGoogleAutoSync(Boolean(data.googleAutoSync));
    setHasMicrosoftToken(Boolean(data.hasMicrosoftToken));
    setMsCalendarId(typeof data.msCalendarId === "string" ? data.msCalendarId : "");
    setMsAutoSync(Boolean(data.msAutoSync));
    const mins: number[] = data.reminderMinutesBefore || [1440, 120];
    setReminderSet(new Set(mins));
    setCanvasLastSyncAt(
      typeof data.canvasLastSyncAt === "string" ? data.canvasLastSyncAt : null
    );
    setCanvasLastSyncError(
      typeof data.canvasLastSyncError === "string" ? data.canvasLastSyncError : ""
    );
    setDailyGoalMinutes(
      typeof data.dailyGoalMinutes === "number" ? data.dailyGoalMinutes : 120
    );
    setWeeklyGoalMinutes(
      typeof data.weeklyGoalMinutes === "number" ? data.weeklyGoalMinutes : 600
    );
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function loadGoogleCalendars() {
    setGoogleCalendarsLoading(true);
    setGoogleCalendars([]);
    const res = await fetch("/api/google/calendars", { cache: "no-store" });
    setGoogleCalendarsLoading(false);
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    const list = Array.isArray(data.calendars) ? data.calendars : [];
    setGoogleCalendars(
      list
        .filter((c: { id?: string }) => typeof c?.id === "string" && c.id.length > 0)
        .map((c: { id: string; name?: string }) => ({
          id: c.id,
          name: typeof c.name === "string" ? c.name : "Calendar"
        }))
    );
  }

  useEffect(() => {
    if (!loading && hasGoogleToken) {
      void loadGoogleCalendars();
    } else if (!hasGoogleToken) {
      setGoogleCalendars([]);
    }
  }, [loading, hasGoogleToken]);

  async function loadMsCalendars() {
    setMsCalendarsLoading(true);
    setMsCalendars([]);
    const res = await fetch("/api/microsoft/calendars", { cache: "no-store" });
    setMsCalendarsLoading(false);
    if (!res.ok) {
      return;
    }
    const data = await res.json();
    const list = Array.isArray(data.calendars) ? data.calendars : [];
    setMsCalendars(
      list
        .filter((c: { id?: string }) => typeof c?.id === "string" && c.id.length > 0)
        .map((c: { id: string; name?: string }) => ({
          id: c.id,
          name: typeof c.name === "string" ? c.name : "Calendar"
        }))
    );
  }

  useEffect(() => {
    if (!loading && hasMicrosoftToken) {
      void loadMsCalendars();
    } else if (!hasMicrosoftToken) {
      setMsCalendars([]);
    }
  }, [loading, hasMicrosoftToken]);

  useEffect(() => {
    const google = searchParams.get("google");
    if (google === "connected") {
      setMessage("Google Calendar connected.");
      setError("");
      void load();
      return;
    }
    if (google === "error") {
      setError("Google Calendar connection failed. Check OAuth environment variables and try again.");
    }
    const ms = searchParams.get("ms");
    if (ms === "connected") {
      setMessage("Microsoft Calendar connected.");
      setError("");
      void load();
      return;
    }
    if (ms === "error") {
      const detail = searchParams.get("detail");
      setError(
        detail
          ? `Microsoft Calendar: ${detail}`
          : "Microsoft Calendar connection failed. Check OAuth environment variables and try again."
      );
    }
  }, [searchParams]);

  function toggleReminder(m: number) {
    setReminderSet((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

  async function saveReminders(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const arr = Array.from(reminderSet).sort((a, b) => b - a);
    if (!arr.length) {
      setError("Pick at least one reminder preset.");
      return;
    }
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderMinutesBefore: arr })
    });
    if (!res.ok) {
      setError("Could not save reminders.");
      return;
    }
    setMessage("Reminder presets saved.");
  }

  async function saveCanvas(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const body: Record<string, string> = { canvasBaseUrl };
    if (canvasTokenInput.trim()) {
      body.canvasAccessToken = canvasTokenInput.trim();
    }
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      setError("Could not save Canvas settings.");
      return;
    }
    setCanvasTokenInput("");
    setMessage("Canvas settings saved.");
    void load();
  }

  async function clearCanvasToken() {
    setMessage("");
    setError("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canvasAccessToken: "" })
    });
    if (!res.ok) {
      setError("Could not clear token.");
      return;
    }
    setHasCanvasToken(false);
    setMessage("Canvas token removed from your account.");
  }

  async function saveGoogleCalendarId(next: string) {
    setMessage("");
    setError("");
    const value = next.trim() || "primary";
    setGoogleCalendarId(value);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleCalendarId: value })
    });
    if (!res.ok) {
      setError("Could not save Google Calendar.");
      void load();
      return;
    }
    setMessage("Google calendar saved.");
  }

  async function saveGoogleAutoSync(nextValue: boolean) {
    setMessage("");
    setError("");
    setGoogleAutoSync(nextValue);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleAutoSync: nextValue })
    });
    if (!res.ok) {
      setGoogleAutoSync(!nextValue);
      setError("Could not update auto-sync setting.");
      return;
    }
    setMessage(nextValue ? "Google auto-sync enabled." : "Google auto-sync disabled.");
  }

  async function disconnectGoogle() {
    setMessage("");
    setError("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleDisconnect: true })
    });
    if (!res.ok) {
      setError("Could not disconnect Google.");
      return;
    }
    setHasGoogleToken(false);
    setGoogleCalendarId("primary");
    setGoogleCalendars([]);
    setMessage("Google Calendar disconnected.");
  }

  function connectGoogle() {
    setGoogleConnecting(true);
    window.location.href = "/api/google/connect";
  }

  async function saveMsCalendarId(next: string) {
    setMessage("");
    setError("");
    setMsCalendarId(next);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msCalendarId: next })
    });
    if (!res.ok) {
      setError("Could not save Outlook calendar.");
      void load();
      return;
    }
    setMessage("Outlook calendar saved.");
  }

  async function saveMsAutoSync(nextValue: boolean) {
    setMessage("");
    setError("");
    setMsAutoSync(nextValue);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msAutoSync: nextValue })
    });
    if (!res.ok) {
      setMsAutoSync(!nextValue);
      setError("Could not update Outlook auto-sync setting.");
      return;
    }
    setMessage(nextValue ? "Outlook auto-sync enabled." : "Outlook auto-sync disabled.");
  }

  async function disconnectMicrosoft() {
    setMessage("");
    setError("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msDisconnect: true })
    });
    if (!res.ok) {
      setError("Could not disconnect Microsoft.");
      return;
    }
    setHasMicrosoftToken(false);
    setMsCalendarId("");
    setMsCalendars([]);
    setMessage("Microsoft Calendar disconnected.");
  }

  function connectMicrosoft() {
    setMsConnecting(true);
    window.location.href = "/api/microsoft/connect";
  }

  async function runSync() {
    setSyncing(true);
    setMessage("");
    setError("");
    const res = await fetch("/api/canvas/sync", { method: "POST" });
    setSyncing(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload?.error || "Sync failed.");
      await load();
      return;
    }
    const payload = await res.json();
    setMessage(
      `Synced: ${payload.assignmentsTouched ?? 0} planner assignments touched, ${payload.classesCreated ?? 0} new classes.`
    );
    await load();
  }

  async function saveGoals(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyGoalMinutes, weeklyGoalMinutes })
    });
    if (!res.ok) {
      setError("Could not save study goals.");
      return;
    }
    setMessage("Study goals saved.");
  }

  if (loading) {
    return (
      <p className="muted" style={{ marginTop: 24 }}>
        Loading settings…
      </p>
    );
  }

  return (
    <>
      <header className="page-header">
        <h1>Settings</h1>
        <p>Connect Canvas, tune reminders, and prepare calendar export.</p>
      </header>

      <div className="grid">
        {message ? <p className="banner-success">{message}</p> : null}
        {error ? <p className="alert-error">{error}</p> : null}

        <section className="card settings-section">
          <h2>Study goals</h2>
          <p className="card-subtitle">
            Used for progress rings on the dashboard and analytics. Adjust anytime.
          </p>
          <form className="form-stack" onSubmit={saveGoals} style={{ marginTop: 16 }}>
            <div className="field">
              <label htmlFor="daily-goal">Daily goal (minutes)</label>
              <input
                id="daily-goal"
                type="number"
                min={5}
                max={1440}
                value={dailyGoalMinutes}
                onChange={(e) => setDailyGoalMinutes(Number(e.target.value) || 5)}
              />
            </div>
            <div className="field">
              <label htmlFor="weekly-goal">Weekly goal (minutes)</label>
              <input
                id="weekly-goal"
                type="number"
                min={30}
                max={10080}
                value={weeklyGoalMinutes}
                onChange={(e) => setWeeklyGoalMinutes(Number(e.target.value) || 30)}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Save goals
            </button>
          </form>
        </section>

        <section className="card settings-section">
          <h2>Reminders</h2>
          <p className="card-subtitle" style={{ marginBottom: 0 }}>
            Email reminders use these offsets before each due date (Resend +
            hourly cron in production). One message per assignment per offset.
          </p>
          <form className="form-stack" onSubmit={saveReminders} style={{ marginTop: 16 }}>
            <div className="checkbox-row">
              {REMINDER_PRESETS.map((p) => (
                <label key={p.minutes}>
                  <input
                    type="checkbox"
                    checked={reminderSet.has(p.minutes)}
                    onChange={() => toggleReminder(p.minutes)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <button type="submit" className="btn btn-primary">
              Save reminder presets
            </button>
          </form>
        </section>

        <section className="card settings-section">
          <h2>Canvas LMS</h2>
          <p className="card-subtitle">
            Use your institution base URL (e.g.{" "}
            <code>https://school.instructure.com</code>) and a personal access
            token from Canvas. Courses and planner assignments sync into Study
            Tracker.
          </p>
          <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: "0.875rem" }}>
            While this tab is open, the app refreshes Canvas about every four hours. The server also
            syncs on the same schedule, so new instructor assignments typically appear within a few
            hours without you doing anything. Use <strong>Sync now</strong> for immediate updates.
          </p>
          {canvasLastSyncAt ? (
            <p className="sync-meta muted" style={{ marginTop: 10, marginBottom: 0 }}>
              Last successful sync:{" "}
              {new Date(canvasLastSyncAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short"
              })}
            </p>
          ) : hasCanvasToken && canvasBaseUrl.trim() ? (
            <p className="sync-meta muted" style={{ marginTop: 10, marginBottom: 0 }}>
              Last successful sync: not yet — run <strong>Sync now</strong> once.
            </p>
          ) : null}
          {canvasLastSyncError ? (
            <p className="canvas-sync-error" role="status">
              Canvas sync issue: {canvasLastSyncError}
            </p>
          ) : null}
          <form className="form-stack" onSubmit={saveCanvas} style={{ marginTop: 16 }}>
            <div className="field">
              <label htmlFor="canvas-url">Canvas base URL</label>
              <input
                id="canvas-url"
                value={canvasBaseUrl}
                onChange={(e) => setCanvasBaseUrl(e.target.value)}
                placeholder="https://yourschool.instructure.com"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="canvas-token">Access token</label>
              <input
                id="canvas-token"
                type="password"
                value={canvasTokenInput}
                onChange={(e) => setCanvasTokenInput(e.target.value)}
                placeholder={
                  hasCanvasToken
                    ? "New token to replace the one on file"
                    : "Paste token from Canvas → Account → Settings"
                }
                autoComplete="off"
              />
              {hasCanvasToken ? (
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  A token is saved. Paste a new one to replace it, or{" "}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "4px 8px", verticalAlign: "baseline" }}
                    onClick={() => void clearCanvasToken()}
                  >
                    remove it
                  </button>
                  .
                </p>
              ) : null}
            </div>
            <div className="row-actions">
              <button type="submit" className="btn btn-primary">
                Save Canvas connection
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={syncing}
                onClick={() => void runSync()}
              >
                {syncing ? "Syncing…" : "Sync now"}
              </button>
            </div>
          </form>
        </section>

        <section className="card settings-section">
          <h2>Google Calendar</h2>
          <p className="card-subtitle">
            Connect your Google account with OAuth, pick which calendar receives new
            events, then use &quot;Push Google&quot; in Assignments. Reconnect once if
            calendar list fails (added read-only calendar scope).
          </p>
          <form className="form-stack" style={{ marginTop: 16 }}>
            {hasGoogleToken ? (
              <div className="field">
                <label htmlFor="google-calendar">Google calendar</label>
                <div className="row-actions" style={{ flexWrap: "wrap", gap: 8 }}>
                  <select
                    id="google-calendar"
                    value={googleCalendarId}
                    onChange={(e) => void saveGoogleCalendarId(e.target.value)}
                    disabled={googleCalendarsLoading}
                    style={{ minWidth: 220, flex: "1 1 200px" }}
                  >
                    <option value="primary">Primary calendar</option>
                    {googleCalendarId !== "primary" &&
                    !googleCalendars.some((c) => c.id === googleCalendarId) ? (
                      <option value={googleCalendarId}>
                        Saved calendar (refresh list if needed)
                      </option>
                    ) : null}
                    {googleCalendars
                      .filter((c) => c.id !== "primary")
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={googleCalendarsLoading}
                    onClick={() => void loadGoogleCalendars()}
                  >
                    {googleCalendarsLoading ? "Loading…" : "Refresh list"}
                  </button>
                </div>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Only calendars you can edit are listed. Updates to existing linked
                  events keep using the stored Google event id.
                </p>
              </div>
            ) : null}
            <div className="row-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={googleConnecting}
                onClick={connectGoogle}
              >
                {googleConnecting ? "Redirecting…" : hasGoogleToken ? "Reconnect Google" : "Connect Google"}
              </button>
              {hasGoogleToken ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void disconnectGoogle()}
                >
                  Disconnect
                </button>
              ) : null}
            </div>
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={googleAutoSync}
                onChange={(e) => void saveGoogleAutoSync(e.target.checked)}
                disabled={!hasGoogleToken}
              />
              Auto-sync assignment create/edit to Google Calendar
            </label>
            {!hasGoogleToken ? (
              <p className="muted" style={{ margin: "4px 0 0" }}>
                Connect Google first to enable auto-sync.
              </p>
            ) : null}
          </form>
        </section>

        <section className="card settings-section">
          <h2>Microsoft Outlook Calendar</h2>
          <p className="card-subtitle">
            Connect your Microsoft account with OAuth, pick which calendar receives new
            events, then use &quot;Push Outlook&quot; in Assignments.
          </p>
          <form className="form-stack" style={{ marginTop: 16 }}>
            {hasMicrosoftToken ? (
              <div className="field">
                <label htmlFor="ms-calendar">Outlook calendar</label>
                <div className="row-actions" style={{ flexWrap: "wrap", gap: 8 }}>
                  <select
                    id="ms-calendar"
                    value={msCalendarId}
                    onChange={(e) => void saveMsCalendarId(e.target.value)}
                    disabled={msCalendarsLoading}
                    style={{ minWidth: 220, flex: "1 1 200px" }}
                  >
                    <option value="">Default calendar</option>
                    {msCalendarId &&
                    !msCalendars.some((c) => c.id === msCalendarId) ? (
                      <option value={msCalendarId}>Saved calendar (reload list if needed)</option>
                    ) : null}
                    {msCalendars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={msCalendarsLoading}
                    onClick={() => void loadMsCalendars()}
                  >
                    {msCalendarsLoading ? "Loading…" : "Refresh list"}
                  </button>
                </div>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Updates to existing linked events still use Microsoft&apos;s event id; new
                  events go to the calendar you choose here.
                </p>
              </div>
            ) : null}
            <div className="row-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={msConnecting}
                onClick={connectMicrosoft}
              >
                {msConnecting
                  ? "Redirecting…"
                  : hasMicrosoftToken
                    ? "Reconnect Outlook"
                    : "Connect Outlook"}
              </button>
              {hasMicrosoftToken ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void disconnectMicrosoft()}
                >
                  Disconnect
                </button>
              ) : null}
            </div>
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={msAutoSync}
                onChange={(e) => void saveMsAutoSync(e.target.checked)}
                disabled={!hasMicrosoftToken}
              />
              Auto-sync assignment create/edit to Outlook Calendar
            </label>
            {!hasMicrosoftToken ? (
              <p className="muted" style={{ margin: "4px 0 0" }}>
                Connect Outlook first to enable auto-sync.
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </>
  );
}
