import { API_ERROR_CODES, type ApiErrorCode } from './error-codes';
import type { ApiErrorResponse, StructuredApiErrorPayload } from './error.types';

const API_ERROR_CODE_VALUES = new Set<string>(Object.values(API_ERROR_CODES));

type HttpExceptionLike = {
  getStatus: () => number;
  getResponse: () => string | object;
};

type PrismaKnownRequestErrorLike = {
  code: string;
  meta?: Record<string, unknown>;
};

export function mapExceptionToApiErrorResponse(exception: unknown): {
  status: number;
  body: ApiErrorResponse;
} {
  if (isHttpException(exception)) {
    return mapHttpException(exception);
  }

  if (isPrismaClientKnownRequestError(exception)) {
    return mapPrismaKnownRequestError(exception);
  }

  return {
    status: 500,
    body: {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Unexpected server error',
      },
    },
  };
}

export function mapHttpException(exception: HttpExceptionLike): {
  status: number;
  body: ApiErrorResponse;
} {
  const status = exception.getStatus();
  const response = exception.getResponse();

  if (isStructuredApiErrorPayload(response)) {
    return {
      status,
      body: {
        success: false,
        error: {
          code: response.code,
          message: response.message,
          ...(response.details !== undefined ? { details: response.details } : {}),
        },
      },
    };
  }

  return {
    status,
    body: {
      success: false,
      error: {
        code: mapStatusToErrorCode(status),
        message: extractHttpExceptionMessage(response),
      },
    },
  };
}

export function mapPrismaKnownRequestError(
  exception: PrismaKnownRequestErrorLike,
): { status: number; body: ApiErrorResponse } {
  switch (exception.code) {
    case 'P2002':
      return {
        status: 409,
        body: {
          success: false,
          error: {
            code: API_ERROR_CODES.CONFLICT,
            message: mapUniqueConstraintMessage(exception),
          },
        },
      };
    case 'P2025':
      return {
        status: 404,
        body: {
          success: false,
          error: {
            code: API_ERROR_CODES.NOT_FOUND,
            message: 'Requested resource not found',
          },
        },
      };
    case 'P2003':
      return {
        status: 400,
        body: {
          success: false,
          error: {
            code: API_ERROR_CODES.BAD_REQUEST,
            message: 'Invalid related resource',
          },
        },
      };
    default:
      return {
        status: 500,
        body: {
          success: false,
          error: {
            code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: 'Unexpected server error',
          },
        },
      };
  }
}

export function mapStatusToErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return API_ERROR_CODES.BAD_REQUEST;
    case 401:
      return API_ERROR_CODES.UNAUTHORIZED;
    case 403:
      return API_ERROR_CODES.FORBIDDEN;
    case 404:
      return API_ERROR_CODES.NOT_FOUND;
    case 409:
      return API_ERROR_CODES.CONFLICT;
    case 429:
      return API_ERROR_CODES.RATE_LIMITED;
    default:
      return status >= 500
        ? API_ERROR_CODES.INTERNAL_SERVER_ERROR
        : API_ERROR_CODES.BAD_REQUEST;
  }
}

function isHttpException(exception: unknown): exception is HttpExceptionLike {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    'getStatus' in exception &&
    'getResponse' in exception &&
    typeof (exception as HttpExceptionLike).getStatus === 'function' &&
    typeof (exception as HttpExceptionLike).getResponse === 'function'
  );
}

function isPrismaClientKnownRequestError(
  exception: unknown,
): exception is PrismaKnownRequestErrorLike {
  return (
    exception instanceof Error &&
    'code' in exception &&
    typeof (exception as PrismaKnownRequestErrorLike).code === 'string' &&
    exception.constructor.name === 'PrismaClientKnownRequestError'
  );
}

function isStructuredApiErrorPayload(
  response: unknown,
): response is StructuredApiErrorPayload {
  if (typeof response !== 'object' || response === null) {
    return false;
  }

  const code = (response as StructuredApiErrorPayload).code;

  return typeof code === 'string' && API_ERROR_CODE_VALUES.has(code);
}

function extractHttpExceptionMessage(response: string | object): string {
  if (typeof response === 'string') {
    return response;
  }

  if (typeof response === 'object' && response !== null) {
    const message = (response as { message?: string | string[] }).message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Request failed';
}

function mapUniqueConstraintMessage(
  exception: PrismaKnownRequestErrorLike,
): string {
  const target = exception.meta?.target;

  if (Array.isArray(target)) {
    const fields = target.filter((field): field is string => typeof field === 'string');
    const normalized = fields.join('_').toLowerCase();

    if (normalized.includes('email')) {
      return 'Email already exists';
    }

    if (normalized.includes('slug')) {
      return 'Slug already exists';
    }

    if (normalized.includes('name')) {
      return 'Name already exists';
    }
  }

  return 'Resource already exists';
}
