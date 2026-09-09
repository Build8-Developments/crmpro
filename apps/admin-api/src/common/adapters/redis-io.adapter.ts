import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisConnectionConfig } from '@crmpro/shared';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(private app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
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
      this.logger.error(`Redis pub client error: ${error.message}`);
    });
    subClient.on('error', (error: Error) => {
      this.logger.error(`Redis sub client error: ${error.message}`);
    });

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
