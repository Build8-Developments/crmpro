import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import type { AuthenticatedUser } from '../../../modules/auth/types/jwt-payload.type';
import { LOGGING_CONFIG_KEYS } from '../logging.constants';
import { HttpMetricsStore } from '../http-metrics.store';
import { LoggingService } from '../logging.service';
import { RequestContextService } from '../request-context.service';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly enabled: boolean;

  constructor(
    private readonly loggingService: LoggingService,
    private readonly requestContext: RequestContextService,
    private readonly httpMetricsStore: HttpMetricsStore,
    configService: ConfigService,
  ) {
    this.enabled =
      configService.get<boolean>(LOGGING_CONFIG_KEYS.enableHttpLogging) ?? true;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.enabled) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: AuthenticatedUser }>();
    const response = http.getResponse<Response>();
    const startedAt = request.requestStartedAt ?? Date.now();

    if (request.user) {
      this.requestContext.set({
        tenantId: request.user.tenantId,
        userId: request.user.id,
      });
    }

    this.loggingService.info({
      module: 'Http',
      operation: 'Request Started',
      requestId: request.requestId,
      tenantId: request.user?.tenantId,
      userId: request.user?.id,
      metadata: {
        method: request.method,
        url: request.originalUrl,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    });

    return next.handle().pipe(
      tap({
        next: (body) => {
          const durationMs = Date.now() - startedAt;
          const statusCode = response.statusCode;

          this.httpMetricsStore.recordRequest(durationMs, statusCode);

          this.loggingService.info({
            module: 'Http',
            operation: 'Request Completed',
            requestId: request.requestId,
            tenantId: request.user?.tenantId,
            userId: request.user?.id,
            durationMs,
            status: String(statusCode),
            metadata: {
              method: request.method,
              url: request.originalUrl,
              responseSizeBytes: this.estimateResponseSize(body),
              ip: request.ip,
              userAgent: request.headers['user-agent'],
            },
          });
        },
        error: (error: Error & { status?: number }) => {
          const durationMs = Date.now() - startedAt;
          const statusCode = error.status ?? 500;

          this.httpMetricsStore.recordRequest(durationMs, statusCode);

          this.loggingService.error({
            module: 'Http',
            operation: 'Request Failed',
            requestId: request.requestId,
            tenantId: request.user?.tenantId,
            userId: request.user?.id,
            durationMs,
            status: String(statusCode),
            metadata: {
              method: request.method,
              url: request.originalUrl,
              ip: request.ip,
              userAgent: request.headers['user-agent'],
              error: error.message,
            },
          });
        },
      }),
    );
  }

  private estimateResponseSize(body: unknown): number | undefined {
    if (body === undefined || body === null) {
      return undefined;
    }

    try {
      return Buffer.byteLength(JSON.stringify(body), 'utf8');
    } catch {
      return undefined;
    }
  }
}
