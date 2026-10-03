import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AUTH_MESSAGES } from '@ucanvas/shared';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { SessionExpiredError } from '../domain/auth.errors';
import { CLOCK, ClockPort } from '../application/ports/clock.port';
import { ChangePasswordUseCase } from '../application/use-cases/change-password.use-case';
import { GetCurrentAccountUseCase } from '../application/use-cases/get-current-account.use-case';
import { LoginResult, LoginUseCase } from '../application/use-cases/login.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../application/use-cases/refresh-session.use-case';
import { RequestPasswordResetUseCase } from '../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { RegisterUseCase } from '../application/use-cases/register.use-case';
import { ResendVerificationUseCase } from '../application/use-cases/resend-verification.use-case';
import { VerifyEmailUseCase } from '../application/use-cases/verify-email.use-case';
import { AuthSessionResponseDto } from './dto/auth-session-response.dto';
import { AuthUserResponseDto } from './dto/auth-user-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailOnlyDto } from './dto/email-only.dto';
import { LoginDto } from './dto/login.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TokenDto } from './dto/token.dto';
import { requestContext } from './request-context';
import {
  assertCsrfHeader,
  clearSessionCookie,
  readSessionCookie,
  SESSION_COOKIE,
  setSessionCookie,
} from './session-cookie';

/** Anonymous endpoints: 10 requests/min per IP on top of the global limit (research R10). */
const ANONYMOUS_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getCurrentAccountUseCase: GetCurrentAccountUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly config: ConfigService,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  private get secureCookies(): boolean {
    return this.config.get<string>('nodeEnv') === 'production';
  }

  private writeSession(res: Response, result: LoginResult): AuthSessionResponseDto {
    setSessionCookie(res, result.cookie.token, {
      rememberMe: result.cookie.rememberMe,
      expiresAt: result.cookie.expiresAt,
      secure: this.secureCookies,
      now: this.clock.now(),
    });
    return AuthSessionResponseDto.fromDomain(result.session);
  }

  @Public()
  @Throttle(ANONYMOUS_LIMIT)
  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Register with email + password',
    description:
      'Always answers 202 with the same message whether the email is new, pending or already registered (no enumeration).',
  })
  @ApiResponse({ status: 202, type: MessageResponseDto })
  @ApiResponse({ status: 422, description: 'PASSWORD_POLICY — `rules` lists every broken rule' })
  @ApiResponse({ status: 429, description: 'Too many requests from this IP' })
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<MessageResponseDto> {
    await this.registerUseCase.execute(dto, requestContext(req));
    return MessageResponseDto.of(AUTH_MESSAGES.CHECK_YOUR_EMAIL);
  }

  @Public()
  @Throttle(ANONYMOUS_LIMIT)
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify the email with the single-use link token (valid 24 h)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'INVALID_LINK — used, expired, replaced or unknown' })
  async verifyEmail(@Body() dto: TokenDto, @Req() req: Request): Promise<MessageResponseDto> {
    await this.verifyEmailUseCase.execute(dto.token, requestContext(req));
    return MessageResponseDto.of(AUTH_MESSAGES.EMAIL_VERIFIED);
  }

  @Public()
  @Throttle(ANONYMOUS_LIMIT)
  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Send a new verification link (pending accounts only; same answer always)',
  })
  @ApiResponse({ status: 202, type: MessageResponseDto })
  async resendVerification(
    @Body() dto: EmailOnlyDto,
    @Req() req: Request,
  ): Promise<MessageResponseDto> {
    await this.resendVerificationUseCase.execute(dto.email, requestContext(req));
    return MessageResponseDto.of(AUTH_MESSAGES.CHECK_YOUR_EMAIL);
  }

  @Public()
  @Throttle(ANONYMOUS_LIMIT)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in; sets the HttpOnly session cookie and returns a short-lived access token',
  })
  @ApiResponse({ status: 200, type: AuthSessionResponseDto })
  @ApiResponse({
    status: 401,
    description:
      'INVALID_CREDENTIALS — unknown email, wrong password or locked account (indistinguishable)',
  })
  @ApiResponse({ status: 403, description: 'EMAIL_NOT_VERIFIED — right password, pending account' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponseDto> {
    const result = await this.loginUseCase.execute(dto, requestContext(req));
    return this.writeSession(res, result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiHeader({ name: 'X-Requested-With', required: true, schema: { enum: ['ucanvas'] } })
  @ApiOperation({ summary: 'New access token from the session cookie (renews activity)' })
  @ApiResponse({ status: 200, type: AuthSessionResponseDto })
  @ApiResponse({ status: 401, description: 'SESSION_EXPIRED — the cookie is cleared' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponseDto> {
    assertCsrfHeader(req);
    try {
      const result = await this.refreshSessionUseCase.execute(readSessionCookie(req));
      return this.writeSession(res, result);
    } catch (error) {
      if (error instanceof SessionExpiredError) clearSessionCookie(res, this.secureCookies);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiHeader({ name: 'X-Requested-With', required: true, schema: { enum: ['ucanvas'] } })
  @ApiOperation({ summary: "Revoke this device's session and clear the cookie (idempotent)" })
  @ApiResponse({ status: 204 })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    assertCsrfHeader(req);
    await this.logoutUseCase.execute(readSessionCookie(req), requestContext(req));
    clearSessionCookie(res, this.secureCookies);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user' })
  @ApiResponse({ status: 200, type: AuthUserResponseDto })
  @ApiResponse({ status: 401, description: 'Missing/expired token or session no longer active' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUserResponseDto> {
    return AuthUserResponseDto.fromDomain(await this.getCurrentAccountUseCase.execute(user.userId));
  }

  @Public()
  @Throttle(ANONYMOUS_LIMIT)
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Email a 60 min reset link (same answer whether the account exists or not)',
  })
  @ApiResponse({ status: 202, type: MessageResponseDto })
  async forgotPassword(
    @Body() dto: EmailOnlyDto,
    @Req() req: Request,
  ): Promise<MessageResponseDto> {
    await this.requestPasswordResetUseCase.execute(dto.email, requestContext(req));
    return MessageResponseDto.of(AUTH_MESSAGES.CHECK_YOUR_EMAIL);
  }

  @Public()
  @Throttle(ANONYMOUS_LIMIT)
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a new password with the reset link; closes every session' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: 'INVALID_LINK' })
  @ApiResponse({ status: 422, description: 'PASSWORD_POLICY — the link is NOT consumed' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.resetPasswordUseCase.execute(dto, requestContext(req));
    clearSessionCookie(res, this.secureCookies);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the password; keeps this session and closes the others' })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 400,
    description: 'INVALID_CURRENT_PASSWORD (counts towards the lockout)',
  })
  @ApiResponse({ status: 422, description: 'PASSWORD_POLICY' })
  @ApiResponse({ status: 423, description: 'ACCOUNT_LOCKED' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.changePasswordUseCase.execute(
      { userId: user.userId, sessionId: user.sessionId, ...dto },
      requestContext(req),
    );
  }
}
