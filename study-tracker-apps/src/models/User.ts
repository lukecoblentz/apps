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
    /** Minutes before due date to remind (e.g. 1440 = 1 day, 120 = 2 hours). */
    reminderMinutesBefore: {
      type: [Number],
      default: [1440, 120]
    }
  },
  { timestamps: true }
);

export const UserModel = models.User || model("User", userSchema);
