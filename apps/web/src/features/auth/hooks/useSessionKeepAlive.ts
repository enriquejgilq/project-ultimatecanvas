import { useEffect, useRef } from 'react';
import { getExpiresAt, subscribe } from '@/lib/authToken';

/** Renew this long before the access token expires. */
const RENEW_BEFORE_MS = 60_000;
/** Only renew if the user interacted within this window (research R3). */
const ACTIVITY_WINDOW_MS = 15 * 60_000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'focus'] as const;

/**
 * Keeps the session alive while the user is actually using the app — even when they only draw
 * on the canvas and make no API calls (SC-004). An abandoned tab is left to expire, so the
 * server's 2 h inactivity rule still applies.
 */
export function useSessionKeepAlive(enabled: boolean, renew: () => Promise<boolean>): void {
  const lastInteractionAt = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return undefined;
    const mark = () => {
      lastInteractionAt.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, mark, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, mark));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      clearTimeout(timer);
      const expiresAt = getExpiresAt();
      if (!expiresAt) return;
      const delay = Math.max(0, expiresAt - Date.now() - RENEW_BEFORE_MS);
      timer = setTimeout(() => {
        if (Date.now() - lastInteractionAt.current < ACTIVITY_WINDOW_MS) void renew();
      }, delay);
    };

    schedule();
    const unsubscribe = subscribe(schedule);
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [enabled, renew]);
}
