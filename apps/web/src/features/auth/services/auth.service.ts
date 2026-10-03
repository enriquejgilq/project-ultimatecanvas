import type {
  AuthSession,
  AuthUser,
  ChangePasswordDto,
  EmailOnlyDto,
  LoginDto,
  MessageResponse,
  RegisterDto,
  ResetPasswordDto,
  TokenDto,
} from '@ucanvas/shared';
import { apiClient } from '@/lib/apiClient';

/** One function per endpoint of specs/001-user-auth/contracts/auth-api.md. */
export const authService = {
  register: (dto: RegisterDto) => apiClient.post<MessageResponse>('/auth/register', dto),
  verifyEmail: (dto: TokenDto) => apiClient.post<MessageResponse>('/auth/verify-email', dto),
  resendVerification: (dto: EmailOnlyDto) =>
    apiClient.post<MessageResponse>('/auth/resend-verification', dto),
  login: (dto: LoginDto) => apiClient.post<AuthSession>('/auth/login', dto),
  refresh: () => apiClient.post<AuthSession>('/auth/refresh', undefined, { authToken: null }),
  logout: () => apiClient.post<void>('/auth/logout', undefined, { authToken: null }),
  forgotPassword: (dto: EmailOnlyDto) =>
    apiClient.post<MessageResponse>('/auth/forgot-password', dto),
  resetPassword: (dto: ResetPasswordDto) => apiClient.post<void>('/auth/reset-password', dto),
  changePassword: (dto: ChangePasswordDto) => apiClient.post<void>('/auth/change-password', dto),
  me: () => apiClient.get<AuthUser>('/auth/me'),
};
