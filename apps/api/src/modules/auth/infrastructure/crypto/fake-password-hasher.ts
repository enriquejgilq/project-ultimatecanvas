import { PasswordHasherPort } from '../../application/ports/password-hasher.port';

/** Fast, deterministic test double. Counts calls so tests can assert timing-equalising work. */
export class FakePasswordHasher implements PasswordHasherPort {
  hashCalls = 0;
  verifyCalls = 0;

  async hash(password: string): Promise<string> {
    this.hashCalls += 1;
    return `hashed:${password}`;
  }

  async verify(hash: string, password: string): Promise<boolean> {
    this.verifyCalls += 1;
    return hash === `hashed:${password}`;
  }
}
