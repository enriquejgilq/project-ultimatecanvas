const FALLBACK = '/';
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/**
 * Only same-origin, path-absolute destinations are allowed after login (FR-028).
 * Anything else — other sites, protocol-relative URLs, backslash tricks, schemes — becomes "/".
 */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith('/')) return FALLBACK;
  if (value.startsWith('//') || value.startsWith('/\\')) return FALLBACK;
  if (value.includes('\\') || CONTROL_CHARS.test(value)) return FALLBACK;

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return FALLBACK;
  } catch {
    return FALLBACK;
  }
  return value;
}
