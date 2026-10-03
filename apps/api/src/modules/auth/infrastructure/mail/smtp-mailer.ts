import { createTransport, type Transporter } from 'nodemailer';
import { MailerPort, MailMessage } from '../../application/ports/mailer.port';

export class SmtpMailer implements MailerPort {
  private readonly transporter: Transporter;

  constructor(
    smtpUrl: string,
    private readonly from: string,
  ) {
    this.transporter = createTransport(smtpUrl);
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
