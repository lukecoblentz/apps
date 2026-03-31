import { Schema, model, models } from "mongoose";

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
    msAutoSync: { type: Boolean, default: false },
    msOAuthState: { type: String, default: "" },
    msOAuthStateExpiresAt: { type: Date, default: null },
    /** Minutes before due date to remind (e.g. 1440 = 1 day, 120 = 2 hours). */
    reminderMinutesBefore: {
      type: [Number],
      default: [1440, 120]
    }
  },
  { timestamps: true }
);

export const UserModel = models.User || model("User", userSchema);
