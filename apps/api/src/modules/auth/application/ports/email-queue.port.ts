import { EmailDispatchKind } from './email-dispatches.repository.port';
import { MailMessage } from './mailer.port';

export const EMAIL_QUEUE = Symbol('EMAIL_QUEUE');

/** Fire-and-forget email sending: callers never wait for delivery (keeps response times uniform). */
export interface EmailQueuePort {
  enqueue(kind: EmailDispatchKind, message: MailMessage): void;
}
