import { EmailDispatchKind } from '../../application/ports/email-dispatches.repository.port';
import { EmailQueuePort } from '../../application/ports/email-queue.port';
import { MailMessage } from '../../application/ports/mailer.port';

/** Test double for the queue: records what would be sent, synchronously. */
export class InMemoryEmailQueue implements EmailQueuePort {
  readonly queued: { kind: EmailDispatchKind; message: MailMessage }[] = [];

  enqueue(kind: EmailDispatchKind, message: MailMessage): void {
    this.queued.push({ kind, message });
  }

  ofKind(kind: EmailDispatchKind): MailMessage[] {
    return this.queued.filter((q) => q.kind === kind).map((q) => q.message);
  }

  /** Extracts the `token` query param of the first link in the last queued email of that kind. */
  lastToken(kind: EmailDispatchKind): string | null {
    const messages = this.ofKind(kind);
    const last = messages[messages.length - 1];
    const match = last?.text.match(/[?&]token=([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }
}
