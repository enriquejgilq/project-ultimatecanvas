import { useMutation } from '@tanstack/react-query';
import type { RegisterDto } from '@ucanvas/shared';
import { authService } from '../services/auth.service';

export function useRegister() {
  return useMutation({ mutationFn: (dto: RegisterDto) => authService.register(dto) });
}
