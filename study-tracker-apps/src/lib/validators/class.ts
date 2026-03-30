import { z } from "zod";

export const classSchema = z.object({
  name: z.string().min(1, "Class name is required").max(80),
  color: z.string().regex(/^#([A-Fa-f0-9]{6})$/, "Use a valid hex color")
});

export type ClassInput = z.infer<typeof classSchema>;
