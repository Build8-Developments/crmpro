import type { IncomingMessage } from 'node:http';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisConnectionConfig } from '@crmpro/shared';
import {
  isAllowedSocketOrigin,
  workspaceUrlTemplate,
} from '../http/workspace-origin';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  private readonly redisLogger = new Logger(RedisIoAdapter.name);

  constructor(private app: INestApplicationContext) {
    super(app);
  }

  connectToRedis(): Promise<void> {
    const configService = this.app.get(ConfigService);

    const connection: RedisConnectionConfig = {
      host: configService.get<string>('redis.host') ?? 'localhost',
      port: configService.get<number>('redis.port') ?? 6379,
      password: configService.get<string>('redis.password'),
    };

    const pubClient = new Redis(connection);
    const subClient = pubClient.duplicate();

    // ioredis retries forever, so an auth or host failure would otherwise be silent.
    pubClient.on('error', (error: Error) => {
      this.redisLogger.error(`Redis pub client error: ${error.message}`);
    });
    subClient.on('error', (error: Error) => {
      this.redisLogger.error(`Redis sub client error: ${error.message}`);
    });

    this.adapterConstructor = createAdapter(pubClient, subClient);
    return Promise.resolve();
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    // Fail closed: gateways must never reflect an arbitrary origin. The CORS
    // option only covers HTTP long-polling, so `allowRequest` checks the
    // WebSocket handshake too.
    const config = this.app.get(ConfigService);
    const exactOrigins = config.get<string[]>('cors.origins') ?? [];
    const template = workspaceUrlTemplate(config);
    const isAllowed = (origin: string | undefined) =>
      isAllowedSocketOrigin(origin, exactOrigins, template);

    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: (
          origin: string | undefined,
          callback: (error: Error | null, allow?: boolean) => void,
        ) => callback(null, isAllowed(origin)),
        credentials: true,
      },
      allowRequest: (
        request: IncomingMessage,
        callback: (error: string | null | undefined, success: boolean) => void,
      ) => callback(null, isAllowed(request.headers.origin)),
    }) as Server;
    server.adapter(this.adapterConstructor);
    return server;
  }
}
