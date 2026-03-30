import { Schema, model, models, Types } from "mongoose";

const sentReminderSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    assignmentId: {
      type: Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true
    },
    /** Same values as User.reminderMinutesBefore (e.g. 1440). */
    minutesBefore: { type: Number, required: true }
  },
  { timestamps: true }
);

sentReminderSchema.index(
  { userId: 1, assignmentId: 1, minutesBefore: 1 },
  { unique: true }
);

export const SentReminderModel =
  models.SentReminder || model("SentReminder", sentReminderSchema);
