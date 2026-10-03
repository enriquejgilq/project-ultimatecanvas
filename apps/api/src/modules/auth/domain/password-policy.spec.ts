import { evaluatePassword } from './password-policy';

const never = () => false;

describe('evaluatePassword', () => {
  it('accepts a valid password', () => {
    expect(evaluatePassword('lienzo-azul-2026', never)).toEqual([]);
  });

  it('requires at least 10 characters', () => {
    expect(evaluatePassword('abc123xyz', never)).toEqual(['PASSWORD_TOO_SHORT']);
    expect(evaluatePassword('abc123xyzw', never)).toEqual([]);
  });

  it('allows at most 128 characters', () => {
    expect(evaluatePassword(`a1${'x'.repeat(126)}`, never)).toEqual([]);
    expect(evaluatePassword(`a1${'x'.repeat(127)}`, never)).toEqual(['PASSWORD_TOO_LONG']);
  });

  it('requires a letter and a number (unicode aware)', () => {
    expect(evaluatePassword('1234567890', never)).toEqual(['PASSWORD_NEEDS_LETTER']);
    expect(evaluatePassword('abcdefghij', never)).toEqual(['PASSWORD_NEEDS_NUMBER']);
    expect(evaluatePassword('ñandúñandú7', never)).toEqual([]);
  });

  it('rejects common passwords case-insensitively', () => {
    const isCommon = (p: string) => p === 'password1234';
    expect(evaluatePassword('PassWord1234', isCommon)).toEqual(['PASSWORD_TOO_COMMON']);
  });

  it('reports every broken rule at once', () => {
    expect(evaluatePassword('', never)).toEqual([
      'PASSWORD_TOO_SHORT',
      'PASSWORD_NEEDS_LETTER',
      'PASSWORD_NEEDS_NUMBER',
    ]);
  });
});
