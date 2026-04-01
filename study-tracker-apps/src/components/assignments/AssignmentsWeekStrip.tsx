"use client";

import Link from "next/link";
import { useMemo } from "react";
import { normalizeAssignmentStatus, type AssignmentItem } from "@/lib/assignments-list";

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday-start week containing `ref`. */
export function startOfWeekMonday(ref: Date): Date {
  const x = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

type Props = {
  assignments: AssignmentItem[];
  now: Date;
};

export default function AssignmentsWeekStrip({ assignments, now }: Props) {
  const weekStart = useMemo(() => startOfWeekMonday(now), [now]);

  const days = useMemo(() => {
    const out: { key: string; label: string; sub: string; count: number; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = localDateKey(d);
      const count = assignments.filter((a) => {
        if (normalizeAssignmentStatus(a.status) === "done") return false;
        return localDateKey(new Date(a.dueAt)) === key;
      }).length;
      const isToday = localDateKey(now) === key;
      out.push({
        key,
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        sub: String(d.getDate()),
        count,
        isToday
      });
    }
    return out;
  }, [assignments, now, weekStart]);

  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <section className="assignments-week-strip card card-animate" aria-label="This week workload">
      <div className="assignments-week-head">
        <h2 className="assignments-week-title">This week</h2>
        <Link href="/calendar" className="assignments-week-cal-link">
          Month view →
        </Link>
      </div>
      <div className="assignments-week-days" role="list">
        {days.map((d) => (
          <div
            key={d.key}
            className={`assignments-week-day${d.isToday ? " assignments-week-day--today" : ""}`}
            role="listitem"
          >
            <span className="assignments-week-day-label">{d.label}</span>
            <span className="assignments-week-day-num">{d.sub}</span>
            <div className="assignments-week-bar-wrap" aria-label={`${d.count} open tasks`}>
              <div
                className="assignments-week-bar"
                style={{ height: `${Math.max(10, (d.count / max) * 100)}%` }}
              />
            </div>
            <span className="assignments-week-count">{d.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
