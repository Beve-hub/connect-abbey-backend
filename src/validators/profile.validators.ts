import { z } from "zod";

export const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  jobTitle: z.string().max(120).optional(),
  avatarUrl: z.string().url().optional(),
  name: z.string().min(1).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
