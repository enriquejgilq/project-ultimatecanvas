import { IDLE_TIMEOUT_MS, REMEMBER_ME_TTL_MS, Session } from './session.entity';

const t0 = new Date('2026-10-02T10:00:00Z');
const at = (ms: number) => new Date(t0.getTime() + ms);

function session(rememberMe: boolean) {
  return Session.create({ id: 's1', userId: 'u1', tokenHash: 'h', rememberMe, now: t0 });
}

describe('Session', () => {
  describe('without remember me', () => {
    it('has no absolute expiry', () => {
      expect(session(false).expiresAt).toBeNull();
    });

    it('stays active until 2 h of inactivity', () => {
      const s = session(false);
      expect(s.isActive(at(IDLE_TIMEOUT_MS - 1))).toBe(true);
      expect(s.isActive(at(IDLE_TIMEOUT_MS))).toBe(false);
    });

    it('activity pushes the idle deadline', () => {
      const s = session(false);
      s.touch(at(IDLE_TIMEOUT_MS - 1));
      expect(s.isActive(at(2 * IDLE_TIMEOUT_MS - 2))).toBe(true);
    });
  });

  describe('with remember me', () => {
    it('expires 30 days after login regardless of activity', () => {
      const s = session(true);
      expect(s.expiresAt).toEqual(at(REMEMBER_ME_TTL_MS));
      s.touch(at(REMEMBER_ME_TTL_MS - 1000));
      expect(s.isActive(at(REMEMBER_ME_TTL_MS - 1))).toBe(true);
      expect(s.isActive(at(REMEMBER_ME_TTL_MS))).toBe(false);
    });

    it('is not affected by inactivity', () => {
      expect(session(true).isActive(at(29 * 24 * 60 * 60 * 1000))).toBe(true);
    });
  });

  it('revocation is final and keeps the first reason', () => {
    const s = session(true);
    s.revoke('LOGOUT', at(1));
    s.revoke('PASSWORD_RESET', at(2));
    expect(s.isActive(at(3))).toBe(false);
    expect(s.revokedReason).toBe('LOGOUT');
    expect(s.revokedAt).toEqual(at(1));
  });
});
