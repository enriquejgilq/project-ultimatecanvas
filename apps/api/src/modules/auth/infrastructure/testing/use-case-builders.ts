import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RequestPasswordResetUseCase } from '../../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { AuthTestKit } from './auth-test-kit';

/** Shared constructors for use cases that other specs need as a precondition (e.g. "logged in"). */
export function buildLogin(kit: AuthTestKit): LoginUseCase {
  return new LoginUseCase(
    kit.accounts,
    kit.sessions,
    kit.hasher,
    kit.tokens,
    kit.accessTokens,
    kit.events,
    kit.clock,
    kit.loginAttempts,
  );
}

export function buildRequestReset(kit: AuthTestKit): RequestPasswordResetUseCase {
  return new RequestPasswordResetUseCase(
    kit.accounts,
    kit.emailTokens,
    kit.tokens,
    kit.events,
    kit.clock,
    kit.links,
    kit.rateLimiter,
  );
}

export function buildResetPassword(kit: AuthTestKit): ResetPasswordUseCase {
  return new ResetPasswordUseCase(
    kit.accounts,
    kit.emailTokens,
    kit.sessions,
    kit.hasher,
    kit.tokens,
    kit.dispatches,
    kit.queue,
    kit.events,
    kit.clock,
    kit.links,
    kit.passwordPolicy,
  );
}

export function buildChangePassword(kit: AuthTestKit): ChangePasswordUseCase {
  return new ChangePasswordUseCase(
    kit.accounts,
    kit.sessions,
    kit.hasher,
    kit.dispatches,
    kit.queue,
    kit.events,
    kit.clock,
    kit.links,
    kit.passwordPolicy,
    kit.loginAttempts,
  );
}
