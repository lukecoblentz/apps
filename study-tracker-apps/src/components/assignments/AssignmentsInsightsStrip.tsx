"use client";

type Props = {
  completionStreak: number;
  todayPercent: number;
  todayTotal: number;
  todayCompleted: number;
  insightLines: string[];
};

export default function AssignmentsInsightsStrip({
  completionStreak,
  todayPercent,
  todayTotal,
  todayCompleted,
  insightLines
}: Props) {
  const lines = insightLines.slice(0, 3);
  const pct = Math.min(100, Math.max(0, todayPercent));

  return (
    <section className="assignments-insights-strip card card-animate" aria-label="Progress and insights">
      <div className="assignments-insights-metrics">
        <div className="assignments-insight-metric">
          <span className="assignments-insight-label">Task streak</span>
          <span className="assignments-insight-value">
            {completionStreak}
            <span className="assignments-insight-unit">d</span>
          </span>
          <span className="assignments-insight-hint">days with a completion</span>
        </div>
        <div className="assignments-insight-metric assignments-insight-metric--progress">
          <span className="assignments-insight-label">Due today</span>
          {todayTotal === 0 ? (
            <p className="assignments-daily-empty muted">Nothing due today</p>
          ) : (
            <div className="assignments-daily-bar-wrap" aria-hidden>
              <div className="assignments-daily-bar">
                <div className="assignments-daily-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="assignments-daily-bar-pct">
                {todayCompleted}/{todayTotal} · {pct}%
              </span>
            </div>
          )}
          <span className="assignments-insight-hint">cleared vs scheduled for today</span>
        </div>
      </div>
      {lines.length > 0 ? (
        <ul className="assignments-insight-lines">
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
