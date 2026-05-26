import { z } from "zod";

export const createActivitySchema = z.object({
  type: z.enum(["EMAIL", "CALL", "MEETING", "NOTE", "TASK", "OTHER"]),
  subject: z.string().min(1, "Subject is required").max(300),
  body: z.string().max(5000).optional(),
  occurredAt: z.string().optional(), // ISO datetime string
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
