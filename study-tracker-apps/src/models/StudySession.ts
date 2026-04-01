import { Schema, model, models, Types } from "mongoose";

const studySessionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    subjectId: { type: Types.ObjectId, ref: "Subject", default: null, index: true },
    durationMinutes: { type: Number, required: true, min: 1, max: 1440 },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    source: {
      type: String,
      enum: ["timer", "manual"],
      default: "timer"
    }
  },
  { timestamps: true }
);

studySessionSchema.index({ userId: 1, endedAt: -1 });

export const StudySessionModel =
  models.StudySession || model("StudySession", studySessionSchema);
