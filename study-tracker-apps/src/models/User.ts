import { Schema, model, models, Types } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: { type: String, required: true },
    /** SHA-256 hex of raw reset token; cleared after use or when issuing a new token. */
    passwordResetTokenHash: { type: String, default: "" },
    passwordResetExpiresAt: { type: Date, default: null },
    canvasBaseUrl: { type: String, default: "" },
    canvasAccessToken: { type: String, default: "" },
    googleAccessToken: { type: String, default: "" },
    googleRefreshToken: { type: String, default: "" },
    googleTokenExpiresAt: { type: Date, default: null },
    googleCalendarId: { type: String, default: "primary" },
    googleAutoSync: { type: Boolean, default: false },
    googleOAuthState: { type: String, default: "" },
    googleOAuthStateExpiresAt: { type: Date, default: null },
    msAccessToken: { type: String, default: "" },
    msRefreshToken: { type: String, default: "" },
    msTokenExpiresAt: { type: Date, default: null },
    /** Empty string = default calendar (`/me/events`). */
    msCalendarId: { type: String, default: "" },
    msAutoSync: { type: Boolean, default: false },
    msOAuthState: { type: String, default: "" },
    msOAuthStateExpiresAt: { type: Date, default: null },
    /** Minutes before due date to remind (e.g. 1440 = 1 day, 120 = 2 hours). */
    reminderMinutesBefore: {
      type: [Number],
      default: [1440, 120]
    },
    /** Shareable code for /register?invite=…; generated at signup or on first invite fetch. */
    inviteCode: { type: String, default: "", trim: true },
    invitedByUserId: { type: Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

userSchema.index(
  { inviteCode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      inviteCode: { $type: "string", $gt: "" }
    }
  }
);

export const UserModel = models.User || model("User", userSchema);
