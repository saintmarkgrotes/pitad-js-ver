import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);
export const passwordSchema = z.string().min(12, 'Use at least 12 characters.').max(128, 'Use at most 128 characters.');
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password.').max(128) });
export const registerSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter at least 2 characters.').max(60, 'Use at most 60 characters.'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
export const codeSchema = z.string().trim().regex(/^\d{6,10}$/, 'Enter the code from your email.');
export const profileSchema = z.object({
  display_name: z.string().trim().min(2, 'Enter at least 2 characters.').max(60),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, 'Use 3–24 lowercase letters, numbers, or underscores.'),
  distance_unit: z.enum(['km', 'mi']),
  is_private: z.boolean(),
});

export function fieldErrors(error) {
  return Object.fromEntries(error.issues.map((issue) => [issue.path[0], issue.message]));
}
