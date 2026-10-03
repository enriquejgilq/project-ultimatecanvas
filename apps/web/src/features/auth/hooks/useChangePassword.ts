import { useMutation } from '@tanstack/react-query';
import type { ChangePasswordDto } from '@ucanvas/shared';
import { authService } from '../services/auth.service';

export function useChangePassword() {
  return useMutation({ mutationFn: (dto: ChangePasswordDto) => authService.changePassword(dto) });
}
