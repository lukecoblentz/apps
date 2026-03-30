import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { sendAssignmentReminderEmail } from "@/lib/email";
import { AssignmentModel } from "@/models/Assignment";
import { SentReminderModel } from "@/models/SentReminder";
import { UserModel } from "@/models/User";

/**
 * Called by Vercel Cron (GET) with Authorization: Bearer CRON_SECRET.
 * Sends one email per (user, assignment, minutesBefore) once the reminder time has passed.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured." },
        { status: 500 }
      );
    }
  } else {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await connectToDatabase();

  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const users = await UserModel.find({}).lean();

  let checked = 0;
  let emailsSent = 0;
  let skippedDuplicate = 0;
  let skippedNoEmail = 0;

  for (const user of users) {
    const uid = String(user._id);
    const email = user.email as string | undefined;
    const raw = user.reminderMinutesBefore as number[] | undefined;
    const offsets =
      raw && raw.length > 0 ? raw : [1440, 120];
    if (!email) {
      continue;
    }

    const assignments = await AssignmentModel.find({
      userId: uid,
      status: "todo",
      dueAt: { $gt: now, $lte: horizon }
    })
      .populate("classId", "name")
      .lean();

    for (const a of assignments) {
      const dueAt = new Date(a.dueAt as Date);
      const title = a.title as string;
      const pop = a.classId as { name?: string } | null;
      const className = pop?.name;

      for (const minutesBefore of offsets) {
        if (typeof minutesBefore !== "number" || minutesBefore < 1) continue;

        checked += 1;
        const fireAt = new Date(dueAt.getTime() - minutesBefore * 60 * 1000);
        if (now < fireAt) {
          continue;
        }

        const exists = await SentReminderModel.findOne({
          userId: uid,
          assignmentId: a._id,
          minutesBefore
        }).lean();
        if (exists) {
          skippedDuplicate += 1;
          continue;
        }

        const result = await sendAssignmentReminderEmail({
          to: email,
          assignmentTitle: title,
          className,
          dueAt,
          minutesBefore
        });

        if (!result.sent) {
          skippedNoEmail += 1;
          continue;
        }

        try {
          await SentReminderModel.create({
            userId: uid,
            assignmentId: a._id,
            minutesBefore
          });
          emailsSent += 1;
        } catch (e) {
          console.error("[reminders] Failed to record SentReminder", e);
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    users: users.length,
    checks: checked,
    emailsSent,
    skippedDuplicate,
    skippedNoEmailOrError: skippedNoEmail
  });
}
