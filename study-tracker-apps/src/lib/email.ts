import { Resend } from "resend";

export async function sendAssignmentReminderEmail(input: {
  to: string;
  assignmentTitle: string;
  className?: string;
  dueAt: Date;
  minutesBefore: number;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(
      "[reminders] RESEND_API_KEY is not set; email skipped for",
      input.to
    );
    return { sent: false as const, reason: "no_api_key" as const };
  }

  const from =
    process.env.EMAIL_FROM?.trim() || "Study Tracker <onboarding@resend.dev>";

  const when = input.dueAt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  const offsetLabel =
    input.minutesBefore >= 1440
      ? `${Math.round(input.minutesBefore / 1440)} day(s)`
      : input.minutesBefore >= 60
        ? `${Math.round(input.minutesBefore / 60)} hour(s)`
        : `${input.minutesBefore} minutes`;

  const subject = `Reminder: "${input.assignmentTitle}" due ${when}`;
  const classLine = input.className ? `Class: ${input.className}\n` : "";
  const text = `This is a ${offsetLabel} reminder from Study Tracker.\n\n${classLine}Assignment: ${input.assignmentTitle}\nDue: ${when}\n`;

  const html = `
    <p style="font-family:system-ui,sans-serif;font-size:15px;color:#0f172a;">
      <strong>${offsetLabel} reminder</strong> from Study Tracker
    </p>
    <p style="font-family:system-ui,sans-serif;font-size:15px;">
      ${input.className ? `<strong>Class:</strong> ${input.className}<br/>` : ""}
      <strong>Assignment:</strong> ${escapeHtml(input.assignmentTitle)}<br/>
      <strong>Due:</strong> ${escapeHtml(when)}
    </p>
  `;

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject,
    text,
    html
  });

  if (error) {
    console.error("[reminders] Resend error", error);
    return { sent: false as const, reason: "resend_error" as const, error };
  }

  return { sent: true as const };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
