import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { createValidationPipeOptions } from './common/filters/validation-pipe.config';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe(createValidationPipeOptions()));

  const configService = app.get(ConfigService);
  // Trust only the configured number of proxy hops: with `true`, any client
  // could set X-Forwarded-For and dodge the per-IP login rate limits.
  app.set('trust proxy', configService.get<number>('app.trustProxyHops') ?? 1);
  const corsOrigins = configService.get<string[]>('cors.origins');

  app.enableCors({
    // Fail closed: an empty allowlist must deny, never reflect the caller's origin.
    origin: corsOrigins?.length ? corsOrigins : false,
    credentials: true,
  });
  if (configService.get<boolean>('app.enableSwagger')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nomow API')
      .setDescription('Nomow backend API documentation')
      .setVersion(configService.get<string>('app.version') ?? '1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.getOrThrow<number>('app.port');

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(port);
}
bootstrap();
