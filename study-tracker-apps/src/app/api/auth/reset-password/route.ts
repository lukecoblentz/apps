import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { hashPasswordResetToken } from "@/lib/password-reset-token";
import { UserModel } from "@/models/User";

const bodySchema = z.object({
  token: z.string().min(1).max(500),
  password: z.string().min(8).max(128)
});

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    const body = await req.json();
    const result = bodySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid password (min 8 characters) or reset link." },
        { status: 400 }
      );
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const tokenHash = hashPasswordResetToken(parsed.token.trim());

  await connectToDatabase();
  const user = await UserModel.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  const passwordHash = await hash(parsed.password, 10);
  await UserModel.findByIdAndUpdate(user._id, {
    $set: {
      passwordHash,
      passwordResetTokenHash: "",
      passwordResetExpiresAt: null
    }
  });

  return NextResponse.json({ ok: true });
}
