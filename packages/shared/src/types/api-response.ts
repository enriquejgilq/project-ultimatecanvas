export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: string | Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
