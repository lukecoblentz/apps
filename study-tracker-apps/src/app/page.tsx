"use client";

import { useEffect, useState } from "react";

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

export default function HomePage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [tab, setTab] = useState<TabKey>("today");

  useEffect(() => {
    async function loadDashboard() {
      setLoadState("loading");
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        if (!res.ok) {
          setLoadState("error");
          setData(null);
          return;
        }
        setData(await res.json());
        setLoadState("ready");
      } catch {
        setLoadState("error");
        setData(null);
      }
    }
    void loadDashboard();
  }, []);

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

  return (
    <>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Stay ahead of deadlines with a clear view of what needs attention.</p>
      </header>

      <div className="grid">
        <div className="stat-grid">
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

        <section className="card card-animate">
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
      </div>
    </>
  );
}
