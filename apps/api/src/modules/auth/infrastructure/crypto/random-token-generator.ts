import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { GeneratedToken, TokenGeneratorPort } from '../../application/ports/token-generator.port';

/** 256-bit random tokens (base64url, 43 chars). SHA-256 is enough to store them: no brute force possible. */
@Injectable()
export class RandomTokenGenerator implements TokenGeneratorPort {
  generate(): GeneratedToken {
    const raw = randomBytes(32).toString('base64url');
    return { raw, hash: this.hash(raw) };
  }

  hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
