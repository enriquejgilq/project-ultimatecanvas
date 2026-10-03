import type { ApiResponse } from '@ucanvas/shared';
import { getAccessToken } from './authToken';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
const HTTP_STATUS_NO_CONTENT = 204;
const HTTP_STATUS_UNAUTHORIZED = 401;
/** Required by the API on /auth/refresh and /auth/logout (CSRF defence in depth). */
const CSRF_HEADER = { 'X-Requested-With': 'ucanvas' };
/** Anonymous auth endpoints: a 401 there is a real answer (e.g. bad credentials), never "renew and retry". */
const PUBLIC_AUTH_PATHS = new Set([
  '/auth/register',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Machine-readable code from `{ error: { code } }` (auth endpoints). */
    public readonly code?: string,
    /** Broken password rules from a 422 PASSWORD_POLICY. */
    public readonly rules?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Overrides the in-memory token; pass `null` to force an anonymous request. */
  authToken?: string | null;
}

/**
 * Called when an authenticated request gets a 401. Resolves true if the session could be
 * renewed (the request is then retried once). Registered by the auth feature's AuthProvider.
 */
type UnauthorizedHandler = () => Promise<boolean>;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

function resolveAuthToken(authToken: RequestOptions['authToken']): string | null {
  if (authToken !== undefined) return authToken;
  return getAccessToken();
}

function toApiError(error: string | Record<string, unknown>, status: number): ApiError {
  if (typeof error === 'string') return new ApiError(error, status);
  if (typeof error.message === 'string') {
    return new ApiError(
      error.message,
      status,
      typeof error.code === 'string' ? error.code : undefined,
      Array.isArray(error.rules) ? error.rules.map(String) : undefined,
    );
  }
  return new ApiError(Object.values(error).flat().map(String).join(', '), status);
}

async function send<T>(path: string, options: RequestOptions): Promise<T> {
  const { authToken, body, headers, ...rest } = options;
  const token = resolveAuthToken(authToken);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...CSRF_HEADER,
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
    if (!payload.success) throw toApiError(payload.error, res.status);
    throw new ApiError(res.statusText, res.status);
  }

  return payload.data;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await send<T>(path, options);
  } catch (error) {
    const canRenew =
      error instanceof ApiError &&
      error.status === HTTP_STATUS_UNAUTHORIZED &&
      !PUBLIC_AUTH_PATHS.has(path) &&
      options.authToken === undefined &&
      unauthorizedHandler !== null;
    if (!canRenew || !(await unauthorizedHandler!())) throw error;
    return send<T>(path, options);
  }
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
