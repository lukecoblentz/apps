import { Schema, model, models, Types } from "mongoose";

const assignmentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    classId: { type: Types.ObjectId, ref: "Class", required: true, index: true },
    dueAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["todo", "done"],
      default: "todo"
    },
    source: {
      type: String,
      enum: ["manual", "canvas"],
      default: "manual"
    },
    externalId: { type: String, sparse: true, index: true },
    googleEventId: { type: String, default: "" },
    userId: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

assignmentSchema.index(
  { userId: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: { externalId: { $type: "string" } }
  }
);

export const AssignmentModel =
  models.Assignment || model("Assignment", assignmentSchema);
