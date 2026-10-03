export const COMMON_PASSWORD_CHECKER = Symbol('COMMON_PASSWORD_CHECKER');

export interface CommonPasswordCheckerPort {
  /** Receives the password already lowercased. */
  isCommon(lowercased: string): boolean;
}
