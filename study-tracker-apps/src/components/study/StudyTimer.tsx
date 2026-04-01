"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Mode = "25" | "50" | "custom";

function playChime() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.start();
    o.stop(ctx.currentTime + 0.2);
    o.onended = () => ctx.close();
  } catch {
    /* ignore */
  }
}

function notifyDone() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") {
    new Notification("Study session complete", {
      body: "Session saved to your log.",
      silent: true
    });
  }
}

type Props = {
  subjects: { _id: string; name: string; color: string }[];
  onSessionLogged?: () => void;
};

export default function StudyTimer({ subjects, onSessionLogged }: Props) {
  const [mode, setMode] = useState<Mode>("25");
  const [customMinutes, setCustomMinutes] = useState(45);
  const totalSeconds = useMemo(() => {
    if (mode === "25") return 25 * 60;
    if (mode === "50") return 50 * 60;
    return Math.min(180, Math.max(5, customMinutes)) * 60;
  }, [mode, customMinutes]);

  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [subjectId, setSubjectId] = useState<string>("");
  const completedRef = useRef(false);

  useEffect(() => {
    if (phase === "idle" || phase === "done") {
      setRemaining(totalSeconds);
    }
  }, [totalSeconds, phase]);

  const logSession = useCallback(async () => {
    const end = new Date();
    const start = new Date(end.getTime() - totalSeconds * 1000);
    const body = {
      durationMinutes: Math.round(totalSeconds / 60),
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      source: "timer" as const,
      subjectId: subjectId || null
    };
    const res = await fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof err?.error === "string" ? err.error : "Could not log session"
      );
    }
    onSessionLogged?.();
  }, [onSessionLogged, subjectId, totalSeconds]);

  useEffect(() => {
    if (!running || phase !== "running") {
      return;
    }
    completedRef.current = false;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          if (!completedRef.current) {
            completedRef.current = true;
            setRunning(false);
            setPhase("done");
            void (async () => {
              try {
                await logSession();
              } catch {
                /* surface nowhere — user sees Done state */
              }
              playChime();
              notifyDone();
              if (Notification.permission === "default") {
                void Notification.requestPermission();
              }
            })();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, phase, logSession]);

  const progress = totalSeconds > 0 ? 1 - remaining / totalSeconds : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const radius = 52;
  const stroke = 6;
  const c = 2 * Math.PI * radius;
  const offset = c * (1 - progress);

  function start() {
    completedRef.current = false;
    setPhase("running");
    setRemaining(totalSeconds);
    setRunning(true);
  }

  function pause() {
    setRunning(false);
  }

  function resume() {
    if (phase === "done") return;
    setRunning(true);
  }

  function reset() {
    setRunning(false);
    setPhase("idle");
    setRemaining(totalSeconds);
    completedRef.current = false;
  }

  return (
    <div className="study-timer card card-animate">
      <div className="study-timer-header">
        <h2 className="study-timer-title">Focus timer</h2>
        <p className="card-subtitle">Completes with a saved study session</p>
      </div>

      <div className="study-timer-modes" role="group" aria-label="Timer length">
        {(
          [
            { key: "25" as const, label: "25 min" },
            { key: "50" as const, label: "50 min" },
            { key: "custom" as const, label: "Custom" }
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`btn btn-sm ${mode === key ? "btn-primary" : "btn-ghost"}`}
            disabled={phase === "running"}
            onClick={() => setMode(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "custom" ? (
        <label className="study-timer-custom">
          <span className="muted">Minutes</span>
          <input
            type="number"
            min={5}
            max={180}
            value={customMinutes}
            disabled={phase === "running"}
            onChange={(e) => setCustomMinutes(Number(e.target.value) || 5)}
          />
        </label>
      ) : null}

      <label className="study-timer-subject">
        <span className="muted">Subject (optional)</span>
        <select
          value={subjectId}
          disabled={phase === "running"}
          onChange={(e) => setSubjectId(e.target.value)}
        >
          <option value="">—</option>
          {subjects.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <div
        className={`study-timer-ring-wrap ${phase === "done" ? "study-timer-done" : ""}`}
      >
        <svg className="study-timer-svg" viewBox="0 0 120 120" aria-hidden>
          <circle
            className="study-timer-track"
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth={stroke}
          />
          <circle
            className="study-timer-progress"
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="study-timer-time">
          {phase === "done" ? (
            <span className="study-timer-celebrate" aria-live="polite">
              Done!
            </span>
          ) : (
            <>
              {mm}:{ss}
            </>
          )}
        </div>
      </div>

      <div className="study-timer-actions">
        {phase === "idle" || phase === "done" ? (
          <button type="button" className="btn btn-primary" onClick={start}>
            {phase === "done" ? "Start again" : "Start"}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={running ? pause : resume}
            >
              {running ? "Pause" : "Resume"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Reset
            </button>
          </>
        )}
      </div>
    </div>
  );
}
