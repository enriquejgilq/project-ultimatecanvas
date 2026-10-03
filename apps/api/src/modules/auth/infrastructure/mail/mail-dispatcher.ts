import { Inject, Injectable, Logger } from '@nestjs/common';
import { MAILER, MailerPort, MailMessage } from '../../application/ports/mailer.port';
import { EmailDispatchKind } from '../../application/ports/email-dispatches.repository.port';
import { EmailQueuePort } from '../../application/ports/email-queue.port';

export const DEFAULT_RETRY_DELAYS_MS = [1_000, 5_000, 25_000];

export const MAIL_RETRY_DELAYS = Symbol('MAIL_RETRY_DELAYS');

/**
 * Fire-and-forget email queue (research R7): requests never wait for SMTP, so response
 * times don't depend on whether an email was sent (FR-024). Retries 3 times with backoff.
 *
 * Known limitation: the queue lives in memory — pending emails are lost if the process
 * restarts. Each attempt logs `{ event: 'mail.sent' | 'mail.failed', kind, attempts, latencyMs }`
 * (no recipient, no link) so SC-002 (p95 < 60 s) can be measured from the logs.
 */
@Injectable()
export class MailDispatcher implements EmailQueuePort {
  private readonly logger = new Logger('MailDispatcher');
  private readonly pending = new Set<Promise<void>>();
  constructor(
    @Inject(MAILER) private readonly mailer: MailerPort,
    @Inject(MAIL_RETRY_DELAYS) private readonly retryDelaysMs: number[] = DEFAULT_RETRY_DELAYS_MS,
  ) {}

  enqueue(kind: EmailDispatchKind, message: MailMessage): void {
    const enqueuedAt = Date.now();
    const job = new Promise<void>((resolve) => setImmediate(resolve))
      .then(() => this.deliver(kind, message, enqueuedAt))
      .finally(() => this.pending.delete(job));
    this.pending.add(job);
  }

  /** Waits for every queued email (tests and graceful shutdown). */
  async drain(): Promise<void> {
    while (this.pending.size > 0) {
      await Promise.all([...this.pending]);
    }
  }

  private async deliver(kind: EmailDispatchKind, message: MailMessage, enqueuedAt: number) {
    const maxAttempts = this.retryDelaysMs.length + 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.mailer.send(message);
        this.logger.log(
          JSON.stringify({
            event: 'mail.sent',
            kind,
            attempts: attempt,
            latencyMs: Date.now() - enqueuedAt,
          }),
        );
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          this.logger.error(
            JSON.stringify({
              event: 'mail.failed',
              kind,
              attempts: attempt,
              latencyMs: Date.now() - enqueuedAt,
              reason: error instanceof Error ? error.message : String(error),
            }),
          );
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, this.retryDelaysMs[attempt - 1]));
      }
    }
  }
}
