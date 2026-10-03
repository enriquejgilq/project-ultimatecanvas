import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '../ports/clock.port';
import {
  EMAIL_DISPATCHES_REPOSITORY,
  EmailDispatchesRepositoryPort,
  EmailDispatchKind,
} from '../ports/email-dispatches.repository.port';
import { EMAIL_QUEUE, EmailQueuePort } from '../ports/email-queue.port';
import { MailMessage } from '../ports/mailer.port';
import { RequestContext } from '../ports/request-context';
import { SECURITY_EVENTS, SecurityEventsPort } from '../ports/security-events.port';

export const MAX_EMAILS_PER_HOUR = 3;
export const MIN_INTERVAL_MS = 60_000;
const HOUR_MS = 60 * 60 * 1000;

/** Kinds a third party can trigger for someone else's address — those are limited (FR-030). */
const LIMITED_KINDS: ReadonlySet<EmailDispatchKind> = new Set([
  'EMAIL_VERIFICATION',
  'PASSWORD_RESET',
  'REGISTRATION_ATTEMPT',
]);

/**
 * Per-address email limit (FR-030/FR-031): at most 3 per kind per hour and 60 s between two.
 * Over the limit nothing is sent and nothing changes in the HTTP response.
 */
@Injectable()
export class EmailRateLimiter {
  constructor(
    @Inject(EMAIL_DISPATCHES_REPOSITORY) private readonly dispatches: EmailDispatchesRepositoryPort,
    @Inject(EMAIL_QUEUE) private readonly queue: EmailQueuePort,
    @Inject(SECURITY_EVENTS) private readonly events: SecurityEventsPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async canSend(email: string, kind: EmailDispatchKind, now: Date): Promise<boolean> {
    if (!LIMITED_KINDS.has(kind)) return true;

    const last = await this.dispatches.lastAt(email, kind);
    if (last && now.getTime() - last.getTime() < MIN_INTERVAL_MS) return false;

    const sent = await this.dispatches.countSince(email, kind, new Date(now.getTime() - HOUR_MS));
    return sent < MAX_EMAILS_PER_HOUR;
  }

  /** Records and enqueues the email if allowed. Returns whether it was sent. */
  async send(
    kind: EmailDispatchKind,
    message: MailMessage,
    ctx: RequestContext = {},
    userId?: string,
  ): Promise<boolean> {
    const now = this.clock.now();
    if (!(await this.canSend(message.to, kind, now))) {
      await this.recordLimited(kind, message.to, ctx, userId);
      return false;
    }
    await this.dispatches.record(message.to, kind, now);
    this.queue.enqueue(kind, message);
    return true;
  }

  /** For callers that check `canSend` up front (to avoid side effects when nothing will be sent). */
  async recordLimited(
    kind: EmailDispatchKind,
    email: string,
    ctx: RequestContext = {},
    userId?: string,
  ): Promise<void> {
    await this.events.record({
      type: 'EMAIL_RATE_LIMITED',
      userId,
      email,
      ...ctx,
      metadata: { kind },
    });
  }
}
