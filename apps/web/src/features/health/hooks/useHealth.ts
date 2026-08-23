import { useEffect, useState } from 'react';
import type { Health } from '@ucanvas/shared';
import { apiClient, ApiError } from '../../../lib/api-client';

interface UseHealthResult {
  health: Health | null;
  error: string | null;
  loading: boolean;
}

export function useHealth(): UseHealthResult {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get<Health>('/health')
      .then((result) => {
        if (!cancelled) setHealth(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Unknown error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { health, error, loading };
}
