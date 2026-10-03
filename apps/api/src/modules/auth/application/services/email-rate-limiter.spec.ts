import { createAuthTestKit } from '../../infrastructure/testing/auth-test-kit';

const message = (to = 'ana@example.com') => ({ to, subject: 's', text: 't', html: 'h' });

describe('EmailRateLimiter', () => {
  it('sends up to 3 emails of a kind per address per hour, 60 s apart', async () => {
    const kit = createAuthTestKit();

    expect(await kit.rateLimiter.send('EMAIL_VERIFICATION', message())).toBe(true);
    kit.clock.advance(60_000);
    expect(await kit.rateLimiter.send('EMAIL_VERIFICATION', message())).toBe(true);
    kit.clock.advance(60_000);
    expect(await kit.rateLimiter.send('EMAIL_VERIFICATION', message())).toBe(true);
    kit.clock.advance(60_000);
    expect(await kit.rateLimiter.send('EMAIL_VERIFICATION', message())).toBe(false);

    expect(kit.queue.ofKind('EMAIL_VERIFICATION')).toHaveLength(3);
    expect(kit.events.types()).toEqual(['EMAIL_RATE_LIMITED']);
  });

  it('requires 60 s between two emails of the same kind', async () => {
    const kit = createAuthTestKit();
    await kit.rateLimiter.send('PASSWORD_RESET', message());
    kit.clock.advance(59_999);
    expect(await kit.rateLimiter.send('PASSWORD_RESET', message())).toBe(false);
    kit.clock.advance(1);
    expect(await kit.rateLimiter.send('PASSWORD_RESET', message())).toBe(true);
  });

  it('frees a slot once the oldest email is more than an hour old', async () => {
    const kit = createAuthTestKit();
    for (let i = 0; i < 3; i += 1) {
      await kit.rateLimiter.send('REGISTRATION_ATTEMPT', message());
      kit.clock.advance(60_000);
    }
    expect(await kit.rateLimiter.send('REGISTRATION_ATTEMPT', message())).toBe(false);
    kit.clock.advance(60 * 60_000 - 2 * 60_000);
    expect(await kit.rateLimiter.send('REGISTRATION_ATTEMPT', message())).toBe(true);
  });

  it('counts limits per kind and per address', async () => {
    const kit = createAuthTestKit();
    await kit.rateLimiter.send('EMAIL_VERIFICATION', message());
    expect(await kit.rateLimiter.send('PASSWORD_RESET', message())).toBe(true);
    expect(await kit.rateLimiter.send('EMAIL_VERIFICATION', message('bea@example.com'))).toBe(true);
  });

  it('never limits system notifications', async () => {
    const kit = createAuthTestKit();
    for (let i = 0; i < 5; i += 1) {
      expect(await kit.rateLimiter.send('LOCKOUT_ALERT', message())).toBe(true);
    }
  });
});
