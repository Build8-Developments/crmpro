import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { createValidationPipeOptions } from './common/filters/validation-pipe.config';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  // The admin refresh token lives in an httpOnly cookie.
  app.use(cookieParser());

  const configService = app.get(ConfigService);
  // Trust only the configured number of proxy hops (see apps/api main.ts).
  app.set('trust proxy', configService.get<number>('app.trustProxyHops') ?? 1);
  const corsOrigins = configService.get<string[]>('cors.origins');

  app.enableCors({
    // Fail closed: an empty allowlist must deny, never reflect the caller's origin.
    origin: corsOrigins?.length ? corsOrigins : false,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe(createValidationPipeOptions()));

  const port = configService.getOrThrow<number>('app.port');

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(port);
}
bootstrap();
