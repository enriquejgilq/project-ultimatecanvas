import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE_CODES,
  type PasswordRuleCode,
} from '@ucanvas/shared';

const LETTER = /\p{L}/u;
const DIGIT = /\p{N}/u;

/**
 * Returns every rule the password breaks (empty array = valid). `isCommon` receives the
 * lowercased password so the check is case-insensitive.
 */
export function evaluatePassword(
  password: string,
  isCommon: (lowercased: string) => boolean,
): PasswordRuleCode[] {
  const broken: PasswordRuleCode[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) broken.push(PASSWORD_RULE_CODES.PASSWORD_TOO_SHORT);
  if (password.length > PASSWORD_MAX_LENGTH) broken.push(PASSWORD_RULE_CODES.PASSWORD_TOO_LONG);
  if (!LETTER.test(password)) broken.push(PASSWORD_RULE_CODES.PASSWORD_NEEDS_LETTER);
  if (!DIGIT.test(password)) broken.push(PASSWORD_RULE_CODES.PASSWORD_NEEDS_NUMBER);
  if (isCommon(password.toLowerCase())) broken.push(PASSWORD_RULE_CODES.PASSWORD_TOO_COMMON);
  return broken;
}
