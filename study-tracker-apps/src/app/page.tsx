"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import StudyTimer from "@/components/study/StudyTimer";
import { fetchDashboardWithRetry } from "@/lib/fetch-dashboard";

type AssignmentRow = {
  _id: string;
  title: string;
  dueAt: string;
  updatedAt?: string;
  status?: string;
  classId?: { name?: string; color?: string };
};

type DashboardPayload = {
  counts: {
    dueToday: number;
    overdue: number;
    thisWeek: number;
  };
  dueToday: AssignmentRow[];
  overdue: AssignmentRow[];
  thisWeek: AssignmentRow[];
  done: AssignmentRow[];
};

type AnalyticsMini = {
  currentStreak: number;
  longestStreak: number;
  todayMinutes: number;
  weekTotalMinutes: number;
  insights: string[];
  goals: {
    dailyGoalMinutes: number;
    weeklyGoalMinutes: number;
    todayProgress: number;
    weekProgress: number;
    behindDaily: boolean;
    behindWeekly: boolean;
  };
};

type SubjectRow = { _id: string; name: string; color: string };

function formatDue(d: string) {
  return new Date(d).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

type TabKey = "today" | "overdue" | "week" | "done";

type LoadState = "loading" | "ready" | "error";

const TAB_HINTS: Record<TabKey, string> = {
  today: "Everything due before midnight.",
  overdue: "Still marked to-do — tackle these first.",
  week: "Due after today through Sunday night (11:59 PM), using the app calendar timezone.",
  done: "Latest completions (last actions first)."
};

const TAB_KEYS: { key: TabKey; label: string }[] = [
  { key: "today", label: "Due today" },
  { key: "overdue", label: "Overdue" },
  { key: "week", label: "Due this week" },
  { key: "done", label: "Done" }
];

const STREAK_KEY = "study-tracker-last-streak";

export default function HomePage() {
  const { status: sessionStatus } = useSession();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsMini | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [tab, setTab] = useState<TabKey>("today");
  const [streakToast, setStreakToast] = useState(false);

  function applyStreakFromApi(j: AnalyticsMini) {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw === null) {
      localStorage.setItem(STREAK_KEY, String(j.currentStreak));
      return;
    }
    const prev = Number(raw);
    if (j.currentStreak > prev) {
      setStreakToast(true);
      window.setTimeout(() => setStreakToast(false), 4500);
    }
    localStorage.setItem(STREAK_KEY, String(j.currentStreak));
  }

  const refreshStudy = useCallback(async () => {
    try {
      const [aRes, sRes] = await Promise.all([
        fetch("/api/analytics", { cache: "no-store" }),
        fetch("/api/subjects", { cache: "no-store" })
      ]);
      if (aRes.ok) {
        const j = (await aRes.json()) as AnalyticsMini;
        setAnalytics(j);
        applyStreakFromApi(j);
      }
      if (sRes.ok) {
        setSubjects(await sRes.json());
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") {
      return;
    }
    if (sessionStatus !== "authenticated") {
      setLoadState("error");
      setData(null);
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoadState("loading");
      try {
        const [dash, aRes, sRes] = await Promise.all([
          fetchDashboardWithRetry() as Promise<DashboardPayload>,
          fetch("/api/analytics", { cache: "no-store" }),
          fetch("/api/subjects", { cache: "no-store" })
        ]);
        if (!cancelled) {
          setData(dash);
          setLoadState("ready");
        }
        if (aRes.ok && !cancelled) {
          const j = (await aRes.json()) as AnalyticsMini;
          setAnalytics(j);
          applyStreakFromApi(j);
        }
        if (sRes.ok && !cancelled) {
          setSubjects(await sRes.json());
        }
      } catch {
        if (!cancelled) {
          setLoadState("error");
          setData(null);
        }
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  const counts = data?.counts ?? {
    dueToday: 0,
    overdue: 0,
    thisWeek: 0
  };

  const list: AssignmentRow[] =
    data == null
      ? []
      : tab === "today"
        ? data.dueToday
        : tab === "overdue"
          ? data.overdue
          : tab === "week"
            ? data.thisWeek
            : data.done;

  const goals = analytics?.goals;

  return (
    <>
      <header className="page-header dashboard-hero">
        <div>
          <h1>Dashboard</h1>
          <p>Build habits, focus with the timer, and stay ahead of deadlines.</p>
        </div>
      </header>

      {streakToast ? (
        <p className="banner-success streak-banner" role="status">
          Streak extended — keep the momentum going.
        </p>
      ) : null}

      <div className="dashboard-layout">
        <div className="dashboard-col dashboard-col-main">
          <StudyTimer subjects={subjects} onSessionLogged={refreshStudy} />

          {goals ? (
            <section className="card card-animate goals-mini">
              <div className="card-header">
                <h2>Goals</h2>
                <p className="card-subtitle">Targets from Settings</p>
              </div>
              <div className="goal-rows goal-rows-compact">
                <div>
                  <div className="goal-row-label">
                    <span>Today</span>
                    <span className="muted">
                      {Math.round(goals.todayProgress)}% ·{" "}
                      {analytics?.todayMinutes ?? 0}/{goals.dailyGoalMinutes} min
                    </span>
                  </div>
                  <div className="goal-bar">
                    <div
                      className="goal-bar-fill"
                      style={{ width: `${Math.min(100, goals.todayProgress)}%` }}
                    />
                  </div>
                  {goals.behindDaily ? (
                    <p className="goal-warn muted">Behind pace — a short block still counts.</p>
                  ) : goals.todayProgress >= 100 ? (
                    <p className="goal-ok muted">Daily goal met. Well done.</p>
                  ) : null}
                </div>
                <div>
                  <div className="goal-row-label">
                    <span>This week</span>
                    <span className="muted">
                      {Math.round(goals.weekProgress)}% ·{" "}
                      {Math.round((analytics?.weekTotalMinutes ?? 0) / 60)}/
                      {Math.round(goals.weeklyGoalMinutes / 60)} h
                    </span>
                  </div>
                  <div className="goal-bar goal-bar-week">
                    <div
                      className="goal-bar-fill"
                      style={{ width: `${Math.min(100, goals.weekProgress)}%` }}
                    />
                  </div>
                  {goals.behindWeekly ? (
                    <p className="goal-warn muted">Weekly goal is still in reach.</p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {analytics && analytics.insights.length > 0 ? (
            <section className="card card-animate insights-mini">
              <h2 className="insights-mini-title">Insights</h2>
              <ul className="insights-list insights-list-compact">
                {analytics.insights.slice(0, 3).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="dashboard-col dashboard-col-aside">
          <section className="card card-animate streak-card">
            <div className="streak-card-label">Streak</div>
            <div className="streak-values">
              <div>
                <div className="streak-n">{loadState === "loading" ? "—" : analytics?.currentStreak ?? "—"}</div>
                <div className="muted">Current</div>
              </div>
              <div className="streak-divider" aria-hidden />
              <div>
                <div className="streak-n">{loadState === "loading" ? "—" : analytics?.longestStreak ?? "—"}</div>
                <div className="muted">Best</div>
              </div>
            </div>
            <p className="muted streak-hint">
              One session per day in your timezone keeps a streak alive.
            </p>
          </section>

          <div className="stat-grid stat-grid-dashboard">
            <article className="stat-card stat-today">
              <div className="stat-label">Due today</div>
              <div className="stat-value">
                {loadState === "loading" ? (
                  <span className="skeleton-inline skeleton-inline-stat" aria-hidden />
                ) : (
                  counts.dueToday
                )}
              </div>
            </article>
            <article className="stat-card stat-overdue">
              <div className="stat-label">Overdue</div>
              <div className="stat-value">
                {loadState === "loading" ? (
                  <span className="skeleton-inline skeleton-inline-stat" aria-hidden />
                ) : (
                  counts.overdue
                )}
              </div>
            </article>
            <article className="stat-card">
              <div className="stat-label">Due this week</div>
              <div className="stat-value">
                {loadState === "loading" ? (
                  <span className="skeleton-inline skeleton-inline-stat" aria-hidden />
                ) : (
                  counts.thisWeek
                )}
              </div>
            </article>
          </div>
        </aside>
      </div>

      <section className="card card-animate dashboard-tasks">
        <div className="card-header">
          <div>
            <h2>Tasks</h2>
            <p className="card-subtitle">{TAB_HINTS[tab]}</p>
          </div>
        </div>

        <div className="tabs" role="tablist">
          {TAB_KEYS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              disabled={loadState === "loading"}
              className={`tab ${tab === key ? "tab-active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {loadState === "error" ? (
          <p className="alert-error">
            Could not load the dashboard. Check your connection and refresh the page.
          </p>
        ) : loadState === "loading" ? (
          <ul className="skeleton-list dashboard-skeleton" aria-busy aria-label="Loading tasks">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="skeleton-row">
                <div className="skeleton-line skeleton-line-lg" />
                <div className="skeleton-line skeleton-line-sm" />
              </li>
            ))}
          </ul>
        ) : list.length ? (
          <ul className="list-plain">
            {list.map((item) => (
              <li key={item._id} className="list-item">
                <div className="list-item-main">
                  {item.classId?.color ? (
                    <span
                      className="class-swatch"
                      style={{ background: item.classId.color }}
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="class-swatch"
                      style={{ background: "var(--text-faint)" }}
                      aria-hidden
                    />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div className="list-item-title">{item.title}</div>
                    <div className="list-item-meta">
                      {tab === "done" ? (
                        <>
                          {item.classId?.name
                            ? `${item.classId.name} · `
                            : null}
                          {item.updatedAt
                            ? `Updated ${formatDue(item.updatedAt)}`
                            : "Completed"}
                        </>
                      ) : (
                        <>
                          {item.classId?.name
                            ? `${item.classId.name} · `
                            : null}
                          {formatDue(item.dueAt)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-hint">
            Nothing in this view. Add assignments or try another tab.
          </p>
        )}
      </section>
    </>
  );
}
