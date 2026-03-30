import { Schema, model, models } from "mongoose";

const classSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    canvasCourseId: { type: String, sparse: true, index: true }
  },
  { timestamps: true }
);

classSchema.index({ userId: 1, canvasCourseId: 1 }, { unique: true, sparse: true });

export const ClassModel = models.Class || model("Class", classSchema);
