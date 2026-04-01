"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type AnalyticsPayload = {
  totalMinutesAllTime: number;
  weekTotalMinutes: number;
  avgSessionMinutes: number;
  currentStreak: number;
  longestStreak: number;
  weeklyBar: { day: string; label: string; minutes: number }[];
  insights: string[];
  goals: {
    dailyGoalMinutes: number;
    weeklyGoalMinutes: number;
    todayProgress: number;
    weekProgress: number;
    behindDaily: boolean;
    behindWeekly: boolean;
  };
  bySubject: { subjectId: string | null; name: string; color: string; minutes: number }[];
  recentSessions: {
    _id: string;
    durationMinutes: number;
    endedAt: string;
    subjectId?: { name?: string; color?: string } | null;
  }[];
};

type LoadState = "loading" | "ready" | "error";

type SubjectOpt = { _id: string; name: string };

export default function AnalyticsPage() {
  const { status } = useSession();
  const [subjectFilter, setSubjectFilter] = useState("");
  const [subjects, setSubjects] = useState<SubjectOpt[]>([]);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const qs = useMemo(
    () => (subjectFilter ? `?subjectId=${encodeURIComponent(subjectFilter)}` : ""),
    [subjectFilter]
  );

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/subjects", { cache: "no-store" });
      if (res.ok && !cancelled) {
        const list = (await res.json()) as SubjectOpt[];
        setSubjects(list);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setLoadState("error");
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadState("loading");
      try {
        const res = await fetch(`/api/analytics${qs}`, { cache: "no-store" });
        if (!res.ok) throw new Error("bad");
        const json = (await res.json()) as AnalyticsPayload;
        if (!cancelled) {
          setData(json);
          setLoadState("ready");
        }
      } catch {
        if (!cancelled) {
          setLoadState("error");
          setData(null);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [status, qs]);

  const chartData = useMemo(() => data?.weeklyBar ?? [], [data]);

  const totalHours = data ? Math.round((data.totalMinutesAllTime / 60) * 10) / 10 : 0;
  const dailyAvgMin = data ? Math.round(data.avgSessionMinutes) : 0;

  return (
    <>
      <header className="page-header">
        <h1>Analytics</h1>
        <p>Study time, streaks, and subject balance at a glance.</p>
      </header>

      {loadState === "error" ? (
        <p className="alert-error">Could not load analytics.</p>
      ) : loadState === "loading" || !data ? (
        <div className="skeleton-list dashboard-skeleton" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-row card" style={{ height: 120 }} />
          ))}
        </div>
      ) : (
        <div className="grid analytics-grid">
          <section className="card card-animate analytics-filters">
            <label className="muted">
              Filter by subject
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="analytics-subject-select"
              >
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="card card-animate stat-grid analytics-stats">
            <article className="stat-card">
              <div className="stat-label">Total hours (all time)</div>
              <div className="stat-value">{totalHours}</div>
            </article>
            <article className="stat-card stat-today">
              <div className="stat-label">Daily average (per study day)</div>
              <div className="stat-value">{dailyAvgMin}m</div>
            </article>
            <article className="stat-card">
              <div className="stat-label">Current streak</div>
              <div className="stat-value">{data.currentStreak}d</div>
            </article>
            <article className="stat-card">
              <div className="stat-label">Longest streak</div>
              <div className="stat-value">{data.longestStreak}d</div>
            </article>
          </section>

          <section className="card card-animate analytics-chart-card">
            <div className="card-header">
              <h2>This week</h2>
              <p className="card-subtitle">Minutes per day (rolling 7 days)</p>
            </div>
            <div className="analytics-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.35} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                    width={36}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: 8
                    }}
                    formatter={(value) => [`${Number(value)} min`, "Study time"]}
                  />
                  <Bar
                    dataKey="minutes"
                    fill="url(#barGrad)"
                    radius={[6, 6, 0, 0]}
                    name="minutes"
                  />
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card card-animate">
            <div className="card-header">
              <h2>Goals</h2>
              <p className="card-subtitle">Set targets in Settings</p>
            </div>
            <div className="goal-rows">
              <div>
                <div className="goal-row-label">
                  <span>Daily</span>
                  <span className="muted">
                    {Math.round(data.goals.todayProgress)}%
                  </span>
                </div>
                <div className="goal-bar">
                  <div
                    className="goal-bar-fill"
                    style={{ width: `${Math.min(100, data.goals.todayProgress)}%` }}
                  />
                </div>
                {data.goals.behindDaily ? (
                  <p className="goal-warn muted">Behind pace for today — you can still catch up.</p>
                ) : null}
              </div>
              <div>
                <div className="goal-row-label">
                  <span>Weekly</span>
                  <span className="muted">
                    {Math.round(data.goals.weekProgress)}%
                  </span>
                </div>
                <div className="goal-bar goal-bar-week">
                  <div
                    className="goal-bar-fill"
                    style={{ width: `${Math.min(100, data.goals.weekProgress)}%` }}
                  />
                </div>
                {data.goals.behindWeekly ? (
                  <p className="goal-warn muted">Weekly goal is within reach — a focused block helps.</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="card card-animate">
            <div className="card-header">
              <h2>Insights</h2>
            </div>
            <ul className="insights-list">
              {data.insights.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="card card-animate">
            <div className="card-header">
              <h2>By subject</h2>
            </div>
            {data.bySubject.length === 0 ? (
              <p className="empty-hint">Log timed sessions with subjects to see a breakdown.</p>
            ) : (
              <ul className="list-plain subject-breakdown">
                {data.bySubject.map((row) => (
                  <li key={row.subjectId ?? "uncat"} className="list-item">
                    <span
                      className="class-swatch"
                      style={{ background: row.color }}
                      aria-hidden
                    />
                    <div className="list-item-main">
                      <div className="list-item-title">{row.name}</div>
                      <div className="list-item-meta">
                        {Math.round(row.minutes)} minutes
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card card-animate">
            <div className="card-header">
              <h2>Recent sessions</h2>
            </div>
            {data.recentSessions.length === 0 ? (
              <p className="empty-hint">Complete a focus timer to build your history.</p>
            ) : (
              <ul className="list-plain">
                {data.recentSessions.map((s) => (
                  <li key={s._id} className="list-item">
                    <div className="list-item-main">
                      <div className="list-item-title">
                        {s.durationMinutes} min
                        {s.subjectId?.name ? ` · ${s.subjectId.name}` : ""}
                      </div>
                      <div className="list-item-meta">
                        {new Date(s.endedAt).toLocaleString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit"
                        })}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
