import { z } from "zod";

export const assignmentSchema = z.object({
  title: z.string().min(1, "Title is required").max(150),
  classId: z.string().min(1, "Class is required"),
  dueAt: z.string().datetime("Use a valid date"),
  description: z.string().max(500).optional().or(z.literal("")),
  status: z.enum(["todo", "done"]).default("todo")
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;
