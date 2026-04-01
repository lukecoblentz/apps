import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { endOfUpcomingSundayNight, getCalendarDefaultTimeZone } from "@/lib/calendar-due-display";
import { connectToDatabase } from "@/lib/mongodb";
import { AssignmentModel } from "@/models/Assignment";
import { getCurrentUserId } from "@/lib/require-user";

const populate = { path: "classId", select: "name color" };

function startOfToday(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfToday(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const now = new Date();
    const todayStart = startOfToday(now);
    const todayEnd = endOfToday(now);
    /** After today through end of Sunday 11:59:59 PM in CALENDAR_DEFAULT_TIMEZONE (or default). */
    const weekEnd = endOfUpcomingSundayNight(now, getCalendarDefaultTimeZone());

    const base = { userId };

    const [
      dueTodayItems,
      overdueItems,
      thisWeekItems,
      doneItems,
      dueTodayCount,
      overdueCount,
      thisWeekCount
    ] = await Promise.all([
      AssignmentModel.find({
        ...base,
        dueAt: { $gte: todayStart, $lt: todayEnd },
        status: "todo"
      })
        .populate(populate)
        .sort({ dueAt: 1 })
        .lean(),
      AssignmentModel.find({
        ...base,
        dueAt: { $lt: now },
        status: "todo"
      })
        .populate(populate)
        .sort({ dueAt: 1 })
        .limit(50)
        .lean(),
      AssignmentModel.find({
        ...base,
        dueAt: { $gte: todayEnd, $lte: weekEnd },
        status: "todo"
      })
        .populate(populate)
        .sort({ dueAt: 1 })
        .lean(),
      AssignmentModel.find({ ...base, status: "done" })
        .populate(populate)
        .sort({ updatedAt: -1 })
        .limit(25)
        .lean(),
      AssignmentModel.countDocuments({
        ...base,
        dueAt: { $gte: todayStart, $lt: todayEnd },
        status: "todo"
      }),
      AssignmentModel.countDocuments({
        ...base,
        dueAt: { $lt: now },
        status: "todo"
      }),
      AssignmentModel.countDocuments({
        ...base,
        dueAt: { $gte: todayEnd, $lte: weekEnd },
        status: "todo"
      })
    ]);

    return NextResponse.json({
      counts: {
        dueToday: dueTodayCount,
        overdue: overdueCount,
        thisWeek: thisWeekCount
      },
      dueToday: dueTodayItems,
      overdue: overdueItems,
      thisWeek: thisWeekItems,
      done: doneItems
    });
  } catch (error) {
    console.error("GET /api/dashboard failed", error);
    return NextResponse.json(
      { error: "Could not load dashboard data." },
      { status: 500 }
    );
  }
}
