import type { Health } from '@ucanvas/shared';
import { apiClient } from '@/lib/apiClient';

export const healthService = {
  check: () => apiClient.get<Health>('/health'),
};
