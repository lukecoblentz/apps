import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

const registerSchema = z.object({
  name: z.string().min(1).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

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
    const user = await UserModel.create({
      name: parsed.data.name,
      email,
      passwordHash
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
