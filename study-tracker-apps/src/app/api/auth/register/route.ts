import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import type { Types } from "mongoose";
import { z } from "zod";
import { generateInviteCode } from "@/lib/invite-code";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

const registerSchema = z.object({
  name: z.string().min(1).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  inviteCode: z.string().trim().min(1).max(64).optional()
});

const INVITE_ATTEMPTS = 8;

async function allocateInviteCode(): Promise<string> {
  for (let i = 0; i < INVITE_ATTEMPTS; i++) {
    const code = generateInviteCode();
    const taken = await UserModel.exists({ inviteCode: code });
    if (!taken) return code;
  }
  throw new Error("Could not allocate invite code");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration data." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const email = parsed.data.email.toLowerCase();
    const existing = await UserModel.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hash(parsed.data.password, 10);
    const newInviteCode = await allocateInviteCode();

    const rawInvite = parsed.data.inviteCode?.trim();
    const referrerDoc = rawInvite
      ? await UserModel.findOne({ inviteCode: rawInvite }).select("_id").lean()
      : null;
    const referrerId =
      referrerDoc && typeof referrerDoc === "object" && "_id" in referrerDoc
        ? (referrerDoc._id as Types.ObjectId)
        : undefined;

    const user = await UserModel.create({
      name: parsed.data.name,
      email,
      passwordHash,
      inviteCode: newInviteCode,
      ...(referrerId ? { invitedByUserId: referrerId } : {})
    });

    return NextResponse.json(
      { id: String(user._id), name: user.name, email: user.email },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/auth/register failed", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
