import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@ucanvas/shared';
import { SessionExpiredError } from '../../domain/auth.errors';
import { toAuthUser } from '../auth-session.mapper';
import { ACCOUNTS_REPOSITORY, AccountsRepositoryPort } from '../ports/accounts.repository.port';

@Injectable()
export class GetCurrentAccountUseCase {
  constructor(@Inject(ACCOUNTS_REPOSITORY) private readonly accounts: AccountsRepositoryPort) {}

  async execute(userId: string): Promise<AuthUser> {
    const account = await this.accounts.findById(userId);
    if (!account || !account.isVerified()) throw new SessionExpiredError();
    return toAuthUser(account);
  }
}
