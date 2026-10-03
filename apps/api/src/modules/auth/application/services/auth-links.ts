import { ConfigService } from '@nestjs/config';

/** Builds the web URLs that go into emails (APP_WEB_URL + route). */
export class AuthLinks {
  constructor(private readonly appWebUrl: string) {}

  static fromConfig(config: ConfigService): AuthLinks {
    return new AuthLinks(config.get<string>('appWebUrl')!);
  }

  verifyEmail(token: string): string {
    return `${this.appWebUrl}/verify-email?token=${encodeURIComponent(token)}`;
  }

  resetPassword(token: string): string {
    return `${this.appWebUrl}/reset-password?token=${encodeURIComponent(token)}`;
  }

  login(): string {
    return `${this.appWebUrl}/login`;
  }

  forgotPassword(): string {
    return `${this.appWebUrl}/forgot-password`;
  }
}

export const AUTH_LINKS = Symbol('AUTH_LINKS');
