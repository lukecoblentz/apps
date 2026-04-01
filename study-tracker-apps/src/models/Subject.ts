import { Schema, model, models, Types } from "mongoose";

const subjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

subjectSchema.index({ userId: 1, name: 1 }, { unique: true });

export const SubjectModel = models.Subject || model("Subject", subjectSchema);

export type SubjectDoc = {
  _id: Types.ObjectId;
  name: string;
  color: string;
  userId: string;
  sortOrder: number;
};
