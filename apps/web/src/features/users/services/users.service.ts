import type { CreateUserDto, UpdateUserDto, User } from '@ucanvas/shared';
import { apiClient } from '@/lib/apiClient';

export const usersService = {
  list: () => apiClient.get<User[]>('/users'),
  getById: (id: string) => apiClient.get<User>(`/users/${id}`),
  create: (dto: CreateUserDto) => apiClient.post<User>('/users', dto),
  update: (id: string, dto: UpdateUserDto) => apiClient.patch<User>(`/users/${id}`, dto),
  remove: (id: string) => apiClient.delete<void>(`/users/${id}`),
};
