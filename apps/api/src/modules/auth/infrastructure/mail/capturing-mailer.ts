import { MailerPort, MailMessage } from '../../application/ports/mailer.port';

/** Test double that keeps every sent message in memory. */
export class CapturingMailer implements MailerPort {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }

  sentTo(to: string): MailMessage[] {
    return this.sent.filter((message) => message.to === to);
  }

  clear(): void {
    this.sent.length = 0;
  }
}
