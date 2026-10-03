import type { Response } from 'supertest';

/** `name=value` of the session cookie from a Set-Cookie header, to replay it in later requests. */
export function sessionCookie(res: Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = raw?.find((c) => c.startsWith('ucanvas_session='));
  if (!cookie) throw new Error('No ucanvas_session cookie in response');
  return cookie.split(';')[0];
}

export function rawSetCookie(res: Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith('ucanvas_session=')) ?? '';
}

export const CSRF = { 'X-Requested-With': 'ucanvas' };
