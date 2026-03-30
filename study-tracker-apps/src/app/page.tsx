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

export default function HomePage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [tab, setTab] = useState<TabKey>("today");

  useEffect(() => {
    async function loadDashboard() {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
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

  const tabLabels: Record<TabKey, { label: string; hint: string }> = {
    today: {
      label: "Due today",
      hint: "Everything due before midnight."
    },
    overdue: {
      label: "Overdue",
      hint: "Still marked to-do — tackle these first."
    },
    week: {
      label: "Next 7 days",
      hint: "After today, within the next week."
    },
    done: {
      label: "Recently done",
      hint: "Latest completions (last actions first)."
    }
  };

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
            <div className="stat-value">{counts.dueToday}</div>
          </article>
          <article className="stat-card stat-overdue">
            <div className="stat-label">Overdue</div>
            <div className="stat-value">{counts.overdue}</div>
          </article>
          <article className="stat-card">
            <div className="stat-label">Next 7 days</div>
            <div className="stat-value">{counts.thisWeek}</div>
          </article>
        </div>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>Tasks</h2>
              <p className="card-subtitle">{tabLabels[tab].hint}</p>
            </div>
          </div>

          <div className="tabs" role="tablist">
            {(
              [
                ["today", "Due today"] as const,
                ["overdue", "Overdue"] as const,
                ["week", "Next 7 days"] as const,
                ["done", "Done"] as const
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`tab ${tab === key ? "tab-active" : ""}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {list.length ? (
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
              {data == null
                ? "Loading…"
                : "Nothing in this view. Add assignments or try another tab."}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
