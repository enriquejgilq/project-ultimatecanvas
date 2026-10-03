import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CommonPasswordCheckerPort } from '../../application/ports/common-password-checker.port';

const DEFAULT_LIST_PATH = join(__dirname, 'common-passwords.txt');

/** Loads the bundled common-password list once (≈100k entries, ≈5 MB in memory). */
export class FileCommonPasswordChecker implements CommonPasswordCheckerPort {
  private readonly passwords: Set<string>;

  constructor(listPath: string = DEFAULT_LIST_PATH) {
    const lines = readFileSync(listPath, 'utf8').split(/\r?\n/);
    this.passwords = new Set(lines.map((line) => line.trim().toLowerCase()).filter(Boolean));
  }

  get size(): number {
    return this.passwords.size;
  }

  isCommon(lowercased: string): boolean {
    return this.passwords.has(lowercased);
  }
}
