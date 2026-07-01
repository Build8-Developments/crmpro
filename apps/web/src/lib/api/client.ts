import type { ApiResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Base URL for the CRM API (e.g. http://localhost:3001/api/v1).
 */
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

/**
 * Normalized API error thrown by the client for any non-success response.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status;
    this.details = params.details ?? null;
  }
}

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  /** Query string params. */
  query?: Record<string, QueryValue>;
  /** Extra headers merged over defaults. */
  headers?: Record<string, string>;
  /** Abort signal. */
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Send/receive the httpOnly refresh cookie.
      credentials: "include",
      signal: options.signal,
    });
  } catch (cause) {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Unable to reach the server. Check your connection.",
      status: 0,
      details: cause,
    });
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // TODO(phase-2): on 401, attempt a single silent refresh via api/auth.ts
  // (backend reads the httpOnly refresh cookie and rotates it), then retry the
  // original request once. If refresh fails, clear auth and redirect to /login.

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // Non-JSON response — surface a generic normalized error.
    if (!response.ok) {
      throw new ApiError({
        code: "UNEXPECTED_RESPONSE",
        message: `Request failed with status ${response.status}`,
        status: response.status,
      });
    }
    return undefined as T;
  }

  if (!response.ok || !payload.success) {
    const error =
      payload && payload.success === false ? payload.error : undefined;
    throw new ApiError({
      code: error?.code ?? "UNKNOWN_ERROR",
      message: error?.message ?? "Something went wrong.",
      status: response.status,
      details: error?.details,
    });
  }

  return payload.data;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};
