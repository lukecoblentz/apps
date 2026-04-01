"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type AssignmentItem = {
  _id: string;
  title: string;
  dueAt: string;
  status: "todo" | "done";
  classId?: { _id?: string; name?: string; color?: string };
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return localDateKey(a) === localDateKey(b);
}

function buildMonthCells(viewYear: number, viewMonth: number) {
  const first = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = first.getDay();
  const cells: { date: Date | null; key: string }[] = [];
  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ date: null, key: `pad-start-${i}` });
  }
  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(viewYear, viewMonth, day);
    cells.push({ date, key: localDateKey(date) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, key: `pad-end-${cells.length}` });
  }
  return cells;
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/assignments", { cache: "no-store" });
    setLoading(false);
    if (!res.ok) {
      setError("Could not load assignments.");
      return;
    }
    const data = await res.json();
    setAssignments(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, AssignmentItem[]>();
    for (const a of assignments) {
      const key = localDateKey(new Date(a.dueAt));
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    }
    for (const list of map.values()) {
      list.sort((x, y) => new Date(x.dueAt).getTime() - new Date(y.dueAt).getTime());
    }
    return map;
  }, [assignments]);

  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);

  const monthLabel = useMemo(
    () =>
      new Date(year, month, 1).toLocaleString(undefined, {
        month: "long",
        year: "numeric"
      }),
    [year, month]
  );

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function goToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
  }

  const today = new Date();

  return (
    <>
      <header className="page-header">
        <h1>Calendar</h1>
        <p>Assignments shown on the day they are due (your local time).</p>
      </header>

      <section className="card calendar-card">
        <div className="calendar-toolbar">
          <h2 className="calendar-month-title">{monthLabel}</h2>
          <div className="row-actions calendar-toolbar-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={prevMonth}>
              ← Prev
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={goToday}>
              Today
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={nextMonth}>
              Next →
            </button>
          </div>
        </div>

        {error ? <p className="alert-error">{error}</p> : null}
        {loading ? (
          <p className="muted" style={{ margin: "12px 0 0" }}>
            Loading…
          </p>
        ) : null}
        {!loading && assignments.length === 0 ? (
          <p className="empty-hint" style={{ marginTop: 16 }}>
            No assignments yet.{" "}
            <Link href="/assignments" className="text-link">
              Add some on Assignments
            </Link>
            .
          </p>
        ) : null}

        {!loading ? (
          <div className="calendar-grid-wrap">
            <div className="calendar-grid" role="grid" aria-label="Assignments by due date">
              {WEEKDAYS.map((d) => (
                <div key={d} className="calendar-weekday" role="columnheader">
                  {d}
                </div>
              ))}
              {cells.map((cell) => {
                if (!cell.date) {
                  return <div key={cell.key} className="calendar-day calendar-day-empty" />;
                }
                const key = localDateKey(cell.date);
                const dayAssignments = byDay.get(key) ?? [];
                const isToday = isSameLocalDay(cell.date, today);

                return (
                  <div
                    key={cell.key}
                    className={`calendar-day${isToday ? " calendar-day-today" : ""}`}
                    role="gridcell"
                    aria-label={cell.date.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric"
                    })}
                  >
                    <div className="calendar-day-num">{cell.date.getDate()}</div>
                    <div className="calendar-day-events">
                      {dayAssignments.map((a) => (
                        <Link
                          key={a._id}
                          href={`/assignments#assignment-${a._id}`}
                          className={`calendar-event-chip${a.status === "done" ? " calendar-event-done" : ""}`}
                          style={
                            a.classId?.color
                              ? { borderLeftColor: a.classId.color }
                              : undefined
                          }
                          title={`${a.title} — ${new Date(a.dueAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                          })}`}
                        >
                          <span className="calendar-event-time">
                            {new Date(a.dueAt).toLocaleTimeString(undefined, {
                              hour: "numeric",
                              minute: "2-digit"
                            })}
                          </span>
                          <span className="calendar-event-title">{a.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
