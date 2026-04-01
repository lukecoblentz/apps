import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { formatDateOnlyInTimeZone } from "@/lib/calendar-due-display";
import { getCalendarDefaultTimeZone } from "@/lib/calendar-due-display";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/require-user";
import { buildStudyAnalyticsForUser } from "@/lib/study-analytics";
import { buildInsightLines, mostActiveDayFromWeeklyBar } from "@/lib/study-insights";
import { StudySessionModel } from "@/models/StudySession";
import { SubjectModel } from "@/models/Subject";
import { UserModel } from "@/models/User";

export const dynamic = "force-dynamic";

function weekdayLongFromYmd(ymd: string, timeZone: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d, 12, 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone
  }).format(new Date(utc));
}

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const filter =
    subjectId && mongoose.Types.ObjectId.isValid(subjectId)
      ? { subjectId }
      : undefined;

  await connectToDatabase();

  const timeZone = getCalendarDefaultTimeZone();

  const [userRaw, stats, allForWeekday, subjectDocs, recent] = await Promise.all([
    UserModel.findById(userId).select("dailyGoalMinutes weeklyGoalMinutes").lean(),
    buildStudyAnalyticsForUser(userId, filter),
    StudySessionModel.find({
      userId,
      ...(filter
        ? { subjectId: new mongoose.Types.ObjectId(filter.subjectId) }
        : {})
    })
      .select("durationMinutes endedAt")
      .lean(),
    SubjectModel.find({ userId }).select("_id name color").lean(),
    StudySessionModel.find({
      userId,
      ...(filter
        ? { subjectId: new mongoose.Types.ObjectId(filter.subjectId) }
        : {})
    })
      .populate("subjectId", "name color")
      .sort({ endedAt: -1 })
      .limit(12)
      .lean()
  ]);

  const weekdaySessionCounts = new Map<string, number>();
  for (const s of allForWeekday) {
    const ymd = formatDateOnlyInTimeZone(new Date(s.endedAt as Date), timeZone);
    const long = weekdayLongFromYmd(ymd, timeZone);
    weekdaySessionCounts.set(long, (weekdaySessionCounts.get(long) ?? 0) + 1);
  }

  let mostSessionsWeekday: { weekday: string; sessions: number } | null = null;
  for (const [weekday, sessions] of weekdaySessionCounts) {
    if (!mostSessionsWeekday || sessions > mostSessionsWeekday.sessions) {
      mostSessionsWeekday = { weekday, sessions };
    }
  }

  const mostActive = mostActiveDayFromWeeklyBar(stats.weeklyBar, timeZone);

  const weekHours = stats.weekTotalMinutes / 60;
  const prevWeekHours = stats.prevWeekTotalMinutes / 60;

  const insights = buildInsightLines({
    weekHours,
    prevWeekHours,
    mostActiveWeekday: mostActive,
    mostSessionsWeekday:
      mostSessionsWeekday && mostSessionsWeekday.sessions > 0
        ? mostSessionsWeekday
        : null,
    avgSessionMinutes: stats.avgSessionMinutes
  });

  const breakdown = await StudySessionModel.aggregate<{
    _id: mongoose.Types.ObjectId | null;
    minutes: number;
  }>([
    { $match: { userId } },
    {
      $group: {
        _id: "$subjectId",
        minutes: { $sum: "$durationMinutes" }
      }
    }
  ]);

  const bySubject = breakdown
    .map((row) => {
      if (row._id == null) {
        return {
          subjectId: null as string | null,
          name: "Uncategorized",
          color: "var(--text-muted)",
          minutes: row.minutes
        };
      }
      const sid = String(row._id);
      const meta = subjectDocs.find((d) => String(d._id) === sid);
      return {
        subjectId: sid,
        name: meta?.name ?? "Subject",
        color: meta?.color ?? "var(--text-faint)",
        minutes: row.minutes
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  const user = userRaw as {
    dailyGoalMinutes?: number;
    weeklyGoalMinutes?: number;
  } | null;

  const dailyGoal = user?.dailyGoalMinutes ?? 120;
  const weeklyGoal = user?.weeklyGoalMinutes ?? 600;
  const dow = new Date().getDay();
  const weekFraction = dow === 0 ? 1 : dow / 7;

  return NextResponse.json({
    ...stats,
    goals: {
      dailyGoalMinutes: dailyGoal,
      weeklyGoalMinutes: weeklyGoal,
      todayProgress:
        dailyGoal > 0 ? Math.min(100, (stats.todayMinutes / dailyGoal) * 100) : 0,
      weekProgress:
        weeklyGoal > 0
          ? Math.min(100, (stats.weekTotalMinutes / weeklyGoal) * 100)
          : 0,
      behindDaily: stats.todayMinutes < dailyGoal * 0.5,
      behindWeekly: stats.weekTotalMinutes < weeklyGoal * weekFraction * 0.85
    },
    insights,
    bySubject,
    recentSessions: recent
  });
}
