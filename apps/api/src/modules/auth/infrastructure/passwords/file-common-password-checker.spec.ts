import { FileCommonPasswordChecker } from './file-common-password-checker';

describe('FileCommonPasswordChecker', () => {
  const checker = new FileCommonPasswordChecker();

  it('bundles at least 10 000 entries (FR-007)', () => {
    expect(checker.size).toBeGreaterThanOrEqual(10_000);
  });

  it('flags well-known passwords', () => {
    expect(checker.isCommon('password123')).toBe(true);
    expect(checker.isCommon('qwerty')).toBe(true);
  });

  it('accepts an uncommon one', () => {
    expect(checker.isCommon('lienzo-2026-xyz')).toBe(false);
  });
});
