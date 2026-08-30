import type { ApiResponse } from '@ucanvas/shared';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
const AUTH_TOKEN_KEY = 'auth_token';
const HTTP_STATUS_NO_CONTENT = 204;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Overrides the token read from storage; pass `null` to force an anonymous request. */
  authToken?: string | null;
}

function resolveAuthToken(authToken: RequestOptions['authToken']): string | null {
  if (authToken !== undefined) return authToken;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function normalizeErrorMessage(error: string | Record<string, unknown>): string {
  if (typeof error === 'string') return error;
  return Object.values(error).flat().map(String).join(', ');
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { authToken, body, headers, ...rest } = options;
  const token = resolveAuthToken(authToken);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === HTTP_STATUS_NO_CONTENT) {
    return undefined as T;
  }

  let payload: ApiResponse<T>;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(res.statusText || 'Unexpected response from the server', res.status);
  }

  if (!res.ok || !payload.success) {
    const message = !payload.success ? normalizeErrorMessage(payload.error) : res.statusText;
    throw new ApiError(message, res.status);
  }

  return payload.data;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
