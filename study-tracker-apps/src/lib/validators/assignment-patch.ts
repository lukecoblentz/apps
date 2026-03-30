import { z } from "zod";

export const assignmentPatchSchema = z
  .object({
    title: z.string().min(1).max(150).optional(),
    description: z.string().max(500).optional(),
    status: z.enum(["todo", "done"]).optional(),
    classId: z.string().min(1).optional(),
    dueAt: z.string().datetime().optional()
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field is required"
  });
