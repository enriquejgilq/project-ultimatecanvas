import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './safeReturnTo';

describe('safeReturnTo', () => {
  it.each(['/users?page=2#x', '/account/security', '/'])('keeps internal path %s', (value) => {
    expect(safeReturnTo(value)).toBe(value);
  });

  it.each([
    null,
    undefined,
    '',
    'users',
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    '/\t/evil',
    '/users\u0000',
    '/a\\b',
  ])('falls back to / for %j', (value) => {
    expect(safeReturnTo(value as string | null)).toBe('/');
  });
});
