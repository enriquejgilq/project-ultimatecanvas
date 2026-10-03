import { MailerPort, MailMessage } from '../../application/ports/mailer.port';
import { MailDispatcher } from './mail-dispatcher';

const message: MailMessage = { to: 'ana@example.com', subject: 's', text: 't', html: 'h' };

describe('MailDispatcher', () => {
  it('does not wait for delivery and sends on drain', async () => {
    const sent: MailMessage[] = [];
    const dispatcher = new MailDispatcher({ send: async (m) => void sent.push(m) }, [0, 0, 0]);

    dispatcher.enqueue('EMAIL_VERIFICATION', message);
    expect(sent).toHaveLength(0);

    await dispatcher.drain();
    expect(sent).toEqual([message]);
  });

  it('retries up to 3 times and then gives up without throwing', async () => {
    let calls = 0;
    const failing: MailerPort = {
      send: async () => {
        calls += 1;
        throw new Error('smtp down');
      },
    };
    const dispatcher = new MailDispatcher(failing, [0, 0, 0]);

    dispatcher.enqueue('PASSWORD_RESET', message);
    await dispatcher.drain();
    expect(calls).toBe(4);
  });

  it('succeeds on a later attempt', async () => {
    let calls = 0;
    const flaky: MailerPort = {
      send: async () => {
        calls += 1;
        if (calls < 3) throw new Error('temporary');
      },
    };
    const dispatcher = new MailDispatcher(flaky, [0, 0, 0]);
    dispatcher.enqueue('PASSWORD_RESET', message);
    await dispatcher.drain();
    expect(calls).toBe(3);
  });
});
