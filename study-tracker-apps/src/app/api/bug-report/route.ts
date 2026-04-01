import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { sendBugReportEmail } from "@/lib/email";

const bodySchema = z.object({
  comment: z.string().trim().min(10, "Please add a bit more detail (at least 10 characters).").max(8000),
  pageUrl: z.string().trim().max(2000).optional()
});

function bugReportRecipient(): string {
  const raw = process.env.BUG_REPORT_EMAIL?.trim();
  return raw && raw.length > 0 ? raw : "lukecoblentz.dev@gmail.com";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const reporterEmail = session.user.email?.trim() ?? "";
  const to = bugReportRecipient();

  const result = await sendBugReportEmail({
    to,
    reporterEmail,
    userId,
    comment: parsed.data.comment,
    pageUrl: parsed.data.pageUrl
  });

  if (result.sent === false) {
    if (result.reason === "no_api_key") {
      return NextResponse.json(
        {
          error:
            "Email is not configured on this server. Ask the admin to set RESEND_API_KEY."
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not send report. Try again in a moment." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
