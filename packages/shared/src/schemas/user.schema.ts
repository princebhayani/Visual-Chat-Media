import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50).optional(),
  bio: z.string().max(300, 'Bio must be under 300 characters').optional(),
  status: z.string().max(100, 'Status must be under 100 characters').optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
});

export const searchUsersSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
