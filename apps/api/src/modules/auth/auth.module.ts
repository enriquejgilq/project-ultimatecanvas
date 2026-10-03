import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ACCOUNTS_REPOSITORY } from './application/ports/accounts.repository.port';
import { CLOCK } from './application/ports/clock.port';
import { COMMON_PASSWORD_CHECKER } from './application/ports/common-password-checker.port';
import { EMAIL_DISPATCHES_REPOSITORY } from './application/ports/email-dispatches.repository.port';
import { EMAIL_QUEUE } from './application/ports/email-queue.port';
import { EMAIL_TOKENS_REPOSITORY } from './application/ports/email-tokens.repository.port';
import { MAILER } from './application/ports/mailer.port';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { SECURITY_EVENTS } from './application/ports/security-events.port';
import { SESSIONS_REPOSITORY } from './application/ports/sessions.repository.port';
import { TOKEN_GENERATOR } from './application/ports/token-generator.port';
import { AUTH_LINKS, AuthLinks } from './application/services/auth-links';
import { EmailRateLimiter } from './application/services/email-rate-limiter';
import { PasswordPolicyService } from './application/services/password-policy.service';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { ResendVerificationUseCase } from './application/use-cases/resend-verification.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { GetCurrentAccountUseCase } from './application/use-cases/get-current-account.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { LoginAttemptsService } from './application/services/login-attempts.service';
import { ACCESS_TOKEN_ISSUER } from './application/ports/access-token-issuer.port';
import { JwtAccessTokenIssuer } from './infrastructure/jwt-access-token.issuer';
import { AuthController } from './presentation/auth.controller';
import { SystemClock } from './infrastructure/clock/system-clock';
import { Argon2PasswordHasher } from './infrastructure/crypto/argon2-password-hasher';
import { RandomTokenGenerator } from './infrastructure/crypto/random-token-generator';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { ConsoleMailer } from './infrastructure/mail/console-mailer';
import {
  DEFAULT_RETRY_DELAYS_MS,
  MAIL_RETRY_DELAYS,
  MailDispatcher,
} from './infrastructure/mail/mail-dispatcher';
import { SmtpMailer } from './infrastructure/mail/smtp-mailer';
import { FileCommonPasswordChecker } from './infrastructure/passwords/file-common-password-checker';
import { PrismaAccountsRepository } from './infrastructure/persistence/prisma-accounts.repository';
import { PrismaEmailDispatchesRepository } from './infrastructure/persistence/prisma-email-dispatches.repository';
import { PrismaEmailTokensRepository } from './infrastructure/persistence/prisma-email-tokens.repository';
import { PrismaSecurityEvents } from './infrastructure/persistence/prisma-security-events';
import { PrismaSessionsRepository } from './infrastructure/persistence/prisma-sessions.repository';

/** The ONLY place that knows which concrete adapter backs each auth port. */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    VerifyEmailUseCase,
    ResendVerificationUseCase,
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    GetCurrentAccountUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    ChangePasswordUseCase,
    LoginAttemptsService,
    JwtStrategy,
    { provide: ACCESS_TOKEN_ISSUER, useClass: JwtAccessTokenIssuer },
    EmailRateLimiter,
    PasswordPolicyService,
    { provide: AUTH_LINKS, inject: [ConfigService], useFactory: AuthLinks.fromConfig },
    MailDispatcher,
    { provide: MAIL_RETRY_DELAYS, useValue: DEFAULT_RETRY_DELAYS_MS },
    { provide: EMAIL_QUEUE, useExisting: MailDispatcher },
    { provide: ACCOUNTS_REPOSITORY, useClass: PrismaAccountsRepository },
    { provide: SESSIONS_REPOSITORY, useClass: PrismaSessionsRepository },
    { provide: EMAIL_TOKENS_REPOSITORY, useClass: PrismaEmailTokensRepository },
    { provide: EMAIL_DISPATCHES_REPOSITORY, useClass: PrismaEmailDispatchesRepository },
    { provide: SECURITY_EVENTS, useClass: PrismaSecurityEvents },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_GENERATOR, useClass: RandomTokenGenerator },
    { provide: CLOCK, useClass: SystemClock },
    { provide: COMMON_PASSWORD_CHECKER, useFactory: () => new FileCommonPasswordChecker() },
    {
      provide: MAILER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<string>('mail.transport') === 'smtp'
          ? new SmtpMailer(config.get<string>('mail.smtpUrl')!, config.get<string>('mail.from')!)
          : new ConsoleMailer(),
    },
  ],
})
export class AuthModule {}
