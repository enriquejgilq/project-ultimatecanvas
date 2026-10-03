/**
 * In-memory store for the short-lived access token (research R2). Never written to
 * localStorage/sessionStorage, so an XSS cannot read a persisted token. A page reload
 * recovers the session through POST /auth/refresh (HttpOnly cookie).
 */
type Listener = () => void;

let accessToken: string | null = null;
let expiresAt: number | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Epoch ms at which the current access token expires, or null. */
export function getExpiresAt(): number | null {
  return expiresAt;
}

export function setAccessToken(token: string, expiresInSeconds: number): void {
  accessToken = token;
  expiresAt = Date.now() + expiresInSeconds * 1000;
  notify();
}

export function clearAccessToken(): void {
  accessToken = null;
  expiresAt = null;
  notify();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
