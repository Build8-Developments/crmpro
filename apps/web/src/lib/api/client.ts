import type { ApiResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { getQueryClient } from "@/lib/query/query-client";
import { resolveApiBaseUrl } from "@/lib/api/resolve-api-base-url";
import {
  TENANT_READ_ONLY_CODE,
  markWorkspaceReadOnly,
  readOnlyAccessEndsAt,
  tenantReadOnlyMessage,
} from "@/lib/api/tenant-read-only";

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
  /** Query string params. */
  query?: Record<string, QueryValue>;
  /** Extra headers merged over defaults. */
  headers?: Record<string, string>;
  /** Abort signal. */
  signal?: AbortSignal;
  /** Do not attach Authorization header. */
  skipAuth?: boolean;
  /** Do not attempt silent refresh on 401. */
  skipRefresh?: boolean;
  /** Internal retry guard after refresh. */
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

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const accessToken = await executeRequest<{ accessToken: string }>(
        "POST",
        "/auth/refresh",
        undefined,
        { skipAuth: true, skipRefresh: true },
      );

      useAuthStore.getState().setAccessToken(accessToken.accessToken);
      return accessToken.accessToken;
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

async function parseResponse<T>(response: Response): Promise<T> {
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

    if (error?.code === TENANT_READ_ONLY_CODE) {
      throw readOnlyError(response.status, error.details);
    }

    throw new ApiError({
      code: error?.code ?? "UNKNOWN_ERROR",
      message: error?.message ?? "Something went wrong.",
      status: response.status,
      details: error?.details,
    });
  }

  return payload.data;
}

/**
 * A write refused because the workspace is read-only: always the same clear
 * message (whatever generic text a screen would show), and the app-wide
 * banner turns on.
 */
function readOnlyError(status: number, details: unknown): ApiError {
  const accessEndsAt = readOnlyAccessEndsAt(details);
  markWorkspaceReadOnly(accessEndsAt);

  return new ApiError({
    code: TENANT_READ_ONLY_CODE,
    message: tenantReadOnlyMessage(accessEndsAt),
    status,
    details,
  });
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
        cache: "no-store",
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

  return parseResponse<T>(response);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  return executeRequest<T>(method, path, body, options);
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};
