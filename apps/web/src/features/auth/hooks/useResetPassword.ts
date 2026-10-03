import { useMutation } from '@tanstack/react-query';
import type { ResetPasswordDto } from '@ucanvas/shared';
import { authService } from '../services/auth.service';

export function useResetPassword() {
  return useMutation({ mutationFn: (dto: ResetPasswordDto) => authService.resetPassword(dto) });
}
