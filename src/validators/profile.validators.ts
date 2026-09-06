import { z } from "zod";

export const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  jobTitle: z.string().max(120).optional(),
  // Accepts a real URL, or "" to let the user clear their avatar.
  avatarUrl: z.union([z.string().url(), z.literal("")]).optional(),
  name: z.string().min(1).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;