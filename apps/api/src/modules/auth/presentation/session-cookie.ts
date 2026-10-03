import { ForbiddenException } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';

export const SESSION_COOKIE = 'ucanvas_session';
const COOKIE_PATH = '/api/v1/auth';
const CSRF_HEADER = 'x-requested-with';
const CSRF_VALUE = 'ucanvas';

function baseOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'strict', path: COOKIE_PATH, secure };
}

/**
 * Without "remember me" it is a browser-session cookie (no Max-Age: gone when the browser
 * closes, FR-011). With it, it lives until the session's absolute expiry (FR-012).
 */
export function setSessionCookie(
  res: Response,
  token: string,
  options: { rememberMe: boolean; expiresAt: Date | null; secure: boolean; now: Date },
): void {
  const cookie: CookieOptions = baseOptions(options.secure);
  if (options.rememberMe && options.expiresAt) {
    cookie.maxAge = Math.max(0, options.expiresAt.getTime() - options.now.getTime());
  }
  res.cookie(SESSION_COOKIE, token, cookie);
}

export function clearSessionCookie(res: Response, secure: boolean): void {
  res.clearCookie(SESSION_COOKIE, baseOptions(secure));
}

export function readSessionCookie(req: Request): string | undefined {
  const value = (req.cookies as Record<string, unknown> | undefined)?.[SESSION_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Cookie-authenticated endpoints also require a custom header (CSRF defence in depth). */
export function assertCsrfHeader(req: Request): void {
  if (req.headers[CSRF_HEADER] !== CSRF_VALUE) {
    throw new ForbiddenException('Missing X-Requested-With header');
  }
}
