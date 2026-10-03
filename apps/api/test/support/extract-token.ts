import { MailMessage } from '../../src/modules/auth/application/ports/mailer.port';

/** Pulls the `token` query parameter out of the first link of an email. */
export function extractToken(message: MailMessage | undefined): string {
  const match = message?.text.match(/[?&]token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error(`No token link found in email: ${message?.subject ?? '(none)'}`);
  return match[1];
}
