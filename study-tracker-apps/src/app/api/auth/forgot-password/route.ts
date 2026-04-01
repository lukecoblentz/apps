import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendPasswordResetEmail } from "@/lib/email";
import { connectToDatabase } from "@/lib/mongodb";
import {
  generatePasswordResetToken,
  hashPasswordResetToken
} from "@/lib/password-reset-token";
import { UserModel } from "@/models/User";

const bodySchema = z.object({
  email: z.string().email()
});

const RESET_TTL_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const generic = {
    ok: true as const,
    message:
      "If an account exists for that email, we sent a link to reset your password."
  };

  let parsed: z.infer<typeof bodySchema>;
  try {
    const body = await req.json();
    const result = bodySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = parsed.email.toLowerCase().trim();

  await connectToDatabase();
  const user = await UserModel.findOne({ email });
  if (!user) {
    return NextResponse.json(generic);
  }

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await UserModel.findByIdAndUpdate(user._id, {
    $set: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt
    }
  });

  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") || req.nextUrl.origin;
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;

  const sendResult = await sendPasswordResetEmail({
    to: user.email,
    resetUrl
  });

  if (!sendResult.sent) {
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      console.info(
        `\n[Study Tracker dev] Password reset for ${user.email} (email not sent — copy this URL):\n${resetUrl}\n`
      );
      if (sendResult.reason === "no_api_key") {
        return NextResponse.json({
          ok: true as const,
          message:
            "Resend is not configured locally (add RESEND_API_KEY to .env.local). The reset link was printed in the terminal where you run `npm run dev` — open that URL in your browser."
        });
      }
      console.error("[forgot-password] Resend error in dev", sendResult);
      return NextResponse.json({
        ok: true as const,
        message:
          "Email failed to send (check RESEND_API_KEY and EMAIL_FROM in .env.local). The reset link was printed in the terminal where you run `npm run dev`."
      });
    }

    await UserModel.findByIdAndUpdate(user._id, {
      $set: {
        passwordResetTokenHash: "",
        passwordResetExpiresAt: null
      }
    });
    console.error("[forgot-password] Email not sent; reset token cleared", sendResult);
    return NextResponse.json(
      {
        error:
          "We could not send email right now. Check that email is configured, or try again later."
      },
      { status: 503 }
    );
  }

  return NextResponse.json(generic);
}
