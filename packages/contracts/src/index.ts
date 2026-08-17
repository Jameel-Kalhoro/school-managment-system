import { z } from 'zod';

/** POST /auth/login */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** POST /auth/refresh */
export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

/** Auth token pair returned by login/refresh. */
export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type TokenPair = z.infer<typeof tokenPairSchema>;
