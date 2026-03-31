"use client";

import { FormEvent, useEffect, useState } from "react";

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
  const [googleTokenInput, setGoogleTokenInput] = useState("");
  const [googleCalendarId, setGoogleCalendarId] = useState("primary");
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const [reminderSet, setReminderSet] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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
    const mins: number[] = data.reminderMinutesBefore || [1440, 120];
    setReminderSet(new Set(mins));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

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

  async function saveGoogle(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const body: Record<string, string> = {
      googleCalendarId: googleCalendarId || "primary"
    };
    if (googleTokenInput.trim()) {
      body.googleAccessToken = googleTokenInput.trim();
    }
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      setError("Could not save Google Calendar settings.");
      return;
    }
    setGoogleTokenInput("");
    setMessage("Google Calendar settings saved.");
    void load();
  }

  async function clearGoogleToken() {
    setMessage("");
    setError("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleAccessToken: "" })
    });
    if (!res.ok) {
      setError("Could not clear Google token.");
      return;
    }
    setHasGoogleToken(false);
    setMessage("Google token removed from your account.");
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
      return;
    }
    const payload = await res.json();
    setMessage(
      `Synced: ${payload.assignmentsTouched ?? 0} planner assignments touched, ${payload.classesCreated ?? 0} new classes.`
    );
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
        {message ? (
          <p
            className="muted"
            style={{
              margin: 0,
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(5, 150, 105, 0.12)",
              color: "var(--success)"
            }}
          >
            {message}
          </p>
        ) : null}
        {error ? <p className="alert-error">{error}</p> : null}

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
          <h2>Google Calendar (MVP)</h2>
          <p className="card-subtitle">
            Manual token flow for now: paste a Google OAuth access token and
            choose a calendar id. Then use &quot;Push Google&quot; in Assignments.
          </p>
          <form className="form-stack" onSubmit={saveGoogle} style={{ marginTop: 16 }}>
            <div className="field">
              <label htmlFor="google-calendar-id">Google calendar id</label>
              <input
                id="google-calendar-id"
                value={googleCalendarId}
                onChange={(e) => setGoogleCalendarId(e.target.value)}
                placeholder="primary"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="google-token">Google access token</label>
              <input
                id="google-token"
                type="password"
                value={googleTokenInput}
                onChange={(e) => setGoogleTokenInput(e.target.value)}
                placeholder={
                  hasGoogleToken
                    ? "Paste new token to replace existing"
                    : "Paste Google OAuth access token"
                }
                autoComplete="off"
              />
              {hasGoogleToken ? (
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  A token is saved. Replace it by pasting a new one, or{" "}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "4px 8px", verticalAlign: "baseline" }}
                    onClick={() => void clearGoogleToken()}
                  >
                    remove it
                  </button>
                  .
                </p>
              ) : null}
            </div>
            <button type="submit" className="btn btn-primary">
              Save Google Calendar settings
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
