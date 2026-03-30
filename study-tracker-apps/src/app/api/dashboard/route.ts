import { NextResponse } from "next/server";
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
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const now = new Date();
  const todayStart = startOfToday(now);
  const todayEnd = endOfToday(now);
  const weekEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 7,
    23,
    59,
    59,
    999
  );

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
}
