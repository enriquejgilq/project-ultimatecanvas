import { Inject, Injectable } from '@nestjs/common';
import { evaluatePassword } from '../../domain/password-policy';
import { PasswordPolicyViolationError } from '../../domain/auth.errors';
import {
  COMMON_PASSWORD_CHECKER,
  CommonPasswordCheckerPort,
} from '../ports/common-password-checker.port';

/** FR-006/FR-007/FR-009: throws with every broken rule so the UI can show them all. */
@Injectable()
export class PasswordPolicyService {
  constructor(
    @Inject(COMMON_PASSWORD_CHECKER) private readonly commonPasswords: CommonPasswordCheckerPort,
  ) {}

  assertValid(password: string): void {
    const broken = evaluatePassword(password, (p) => this.commonPasswords.isCommon(p));
    if (broken.length) throw new PasswordPolicyViolationError(broken);
  }
}
