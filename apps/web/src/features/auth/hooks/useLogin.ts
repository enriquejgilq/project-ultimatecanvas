import { useMutation } from '@tanstack/react-query';
import type { LoginDto } from '@ucanvas/shared';
import { useAuth } from './useAuth';

export function useLogin() {
  const { login } = useAuth();
  return useMutation({ mutationFn: (dto: LoginDto) => login(dto) });
}
