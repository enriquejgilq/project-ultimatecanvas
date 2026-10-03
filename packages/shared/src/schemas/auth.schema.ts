import { z } from 'zod';
import {
  AUTH_ERROR_CODES,
  AUTH_MESSAGES,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE_CODES,
  PASSWORD_RULE_MESSAGES,
} from '../constants/auth';

const LETTER = /\p{L}/u;
const DIGIT = /\p{N}/u;

/** Client-checkable password rules. The common-password list is enforced server-side only. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_RULE_MESSAGES.PASSWORD_TOO_SHORT)
  .max(PASSWORD_MAX_LENGTH, PASSWORD_RULE_MESSAGES.PASSWORD_TOO_LONG)
  .regex(LETTER, PASSWORD_RULE_MESSAGES.PASSWORD_NEEDS_LETTER)
  .regex(DIGIT, PASSWORD_RULE_MESSAGES.PASSWORD_NEEDS_NUMBER);

export const emailSchema = z.string().trim().toLowerCase().email(AUTH_MESSAGES.INVALID_EMAIL);

export const registerSchema = z.object({ email: emailSchema, password: passwordSchema });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  rememberMe: z.boolean(),
});

export const emailOnlySchema = z.object({ email: emailSchema });

/** 32 random bytes, base64url without padding. */
export const tokenSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });

export const resetPasswordSchema = tokenSchema.extend({ newPassword: passwordSchema });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  newPassword: passwordSchema,
});

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  emailVerified: z.literal(true),
});

export const authSessionSchema = z.object({
  accessToken: z.string(),
  /** Seconds until the access token expires. */
  expiresIn: z.number().int().positive(),
  user: authUserSchema,
});

export const authErrorSchema = z.object({
  code: z.nativeEnum(AUTH_ERROR_CODES),
  message: z.string(),
  rules: z.array(z.nativeEnum(PASSWORD_RULE_CODES)).optional(),
});

export const messageResponseSchema = z.object({ message: z.string() });

/**
 * Returns every password rule the value breaks (client-side subset: no common-password check).
 * Used for live hints in the UI.
 */
export function clientPasswordRuleViolations(password: string) {
  const rules: (typeof PASSWORD_RULE_CODES)[keyof typeof PASSWORD_RULE_CODES][] = [];
  if (password.length < PASSWORD_MIN_LENGTH) rules.push(PASSWORD_RULE_CODES.PASSWORD_TOO_SHORT);
  if (password.length > PASSWORD_MAX_LENGTH) rules.push(PASSWORD_RULE_CODES.PASSWORD_TOO_LONG);
  if (!LETTER.test(password)) rules.push(PASSWORD_RULE_CODES.PASSWORD_NEEDS_LETTER);
  if (!DIGIT.test(password)) rules.push(PASSWORD_RULE_CODES.PASSWORD_NEEDS_NUMBER);
  return rules;
}

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type EmailOnlyDto = z.infer<typeof emailOnlySchema>;
export type TokenDto = z.infer<typeof tokenSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type AuthErrorBody = z.infer<typeof authErrorSchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
