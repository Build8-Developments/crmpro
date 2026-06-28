import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_SLOW_QUERY_THRESHOLD_MS,
  LOGGING_CONFIG_KEYS,
} from '../logging/logging.constants';
import { LoggingService } from '../logging/logging.service';

export function logSlowQueryIfNeeded(
  loggingService: LoggingService,
  configService: ConfigService,
  operation: string,
  durationMs: number,
): void {
  const enabled =
    configService.get<boolean>(LOGGING_CONFIG_KEYS.enableQueryLogging) ?? true;

  if (!enabled) {
    return;
  }

  const thresholdMs =
    configService.get<number>(LOGGING_CONFIG_KEYS.slowQueryThresholdMs) ??
    DEFAULT_SLOW_QUERY_THRESHOLD_MS;

  if (durationMs < thresholdMs) {
    return;
  }

  loggingService.warn({
    module: 'Prisma',
    operation,
    durationMs,
    status: 'slow_query',
  });
}

export function createSlowQueryExtension(
  loggingService: LoggingService,
  configService: ConfigService,
) {
  return Prisma.defineExtension({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const startedAt = Date.now();
          const result = await query(args);
          logSlowQueryIfNeeded(
            loggingService,
            configService,
            `${model}.${operation}`,
            Date.now() - startedAt,
          );
          return result;
        },
      },
    },
  });
}
