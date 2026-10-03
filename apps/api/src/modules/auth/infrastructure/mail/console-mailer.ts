import { Injectable, Logger } from '@nestjs/common';
import { MailerPort, MailMessage } from '../../application/ports/mailer.port';

/**
 * Development/test transport: writes the email (links included) to the API log.
 * Env validation forbids MAIL_TRANSPORT=console in production.
 */
@Injectable()
export class ConsoleMailer implements MailerPort {
  private readonly logger = new Logger('ConsoleMailer');

  async send(message: MailMessage): Promise<void> {
    this.logger.log(`\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`);
  }
}
