import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  avatarUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  team: z.string().max(100).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
