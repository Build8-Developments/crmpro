/**
 * Standardized CRM API contract.
 * See docs/web/phase-01.md §3.3.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorResponse;
