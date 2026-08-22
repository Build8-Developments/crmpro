import type { ApiResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { getQueryClient } from "@/lib/query/query-client";
import { resolveApiBaseUrl } from "@/lib/api/resolve-api-base-url";
import {
  getStoredRefreshToken,
  setStoredRefreshToken,
} from "@/lib/api/refresh-token";

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

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  skipAuth?: boolean;
  skipRefresh?: boolean;
  _isRetry?: boolean;
}

let refreshPromise: Promise<string> | null = null;

export function handleAuthFailure(): void {
  useAuthStore.getState().clearAuth();
  getQueryClient()?.clear();

  if (typeof window !== "undefined") {
    const onLoginRoute = window.location.pathname.startsWith("/login");
    if (!onLoginRoute) {
      window.location.assign("/login");
    }
  }
}

/**
 * Admin-api returns auth tokens at the top level (not under `data`).
 * Refresh requires the refresh token in the request body (no httpOnly cookie).
 */
async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        throw new ApiError({
          code: "NO_REFRESH_TOKEN",
          message: "Session expired. Please sign in again.",
          status: 401,
        });
      }

      const result = await executeAuthRequest<{
        accessToken: string;
        refreshToken: string;
      }>("POST", "/auth/refresh", { refreshToken });

      setStoredRefreshToken(result.refreshToken);
      useAuthStore.getState().setAccessToken(result.accessToken);
      return result.accessToken;
    } catch (error) {
      handleAuthFailure();
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const baseUrl = resolveApiBaseUrl();
  const url = new URL(normalizedPath, baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
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

type AuthEnvelope = {
  success?: boolean;
  error?: { code?: string; message?: string; details?: unknown };
  [key: string]: unknown;
};

/**
 * Parse admin-api auth responses where tokens live at the top level.
 */
async function parseAuthPayload<T>(response: Response): Promise<T> {
  let payload: AuthEnvelope | null = null;
  try {
    payload = (await response.json()) as AuthEnvelope;
  } catch {
    throw new ApiError({
      code: "UNEXPECTED_RESPONSE",
      message: `Request failed with status ${response.status}`,
      status: response.status,
    });
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError({
      code: payload?.error?.code ?? "UNKNOWN_ERROR",
      message: payload?.error?.message ?? "Something went wrong.",
      status: response.status,
      details: payload?.error?.details,
    });
  }

  const { success: _success, error: _error, ...rest } = payload;
  return rest as T;
}

async function executeAuthRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
        cache: "no-store",
    });
  } catch (cause) {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Unable to reach the server. Check your connection.",
      status: 0,
      details: cause,
    });
  }

  return parseAuthPayload<T>(response);
}

async function executeRequest<T>(
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
  if (!options.skipAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

  if (
    response.status === 401 &&
    !options.skipRefresh &&
    !options._isRetry
  ) {
    await refreshAccessToken();
    return executeRequest<T>(method, path, body, {
      ...options,
      _isRetry: true,
    });
  }

  return parseEnvelope<T>(response);
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    executeRequest<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    executeRequest<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    executeRequest<T>("PATCH", path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    executeRequest<T>("DELETE", path, undefined, options),
  /** Auth endpoints that return tokens at the top level. */
  authPost: <T>(path: string, body?: unknown) =>
    executeAuthRequest<T>("POST", path, body),
};
