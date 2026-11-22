import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RATE_LIMIT_COMMAND_TIMEOUT_MS } from './rate-limit.constants';
import { RateLimitService } from './rate-limit.service';

const mockConsumeRateLimit = jest.fn();
const mockDefineCommand = jest.fn();
const mockOn = jest.fn();
const mockQuit = jest.fn().mockResolvedValue('OK');
const mockConnections: unknown[] = [];

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((connection: unknown) => {
    mockConnections.push(connection);
    return {
      consumeRateLimit: mockConsumeRateLimit,
      defineCommand: mockDefineCommand,
      on: mockOn,
      quit: mockQuit,
    };
  }),
}));

describe('RateLimitService', () => {
  let service: RateLimitService;
  let configGet: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConnections.length = 0;

    configGet = jest.fn((key: string) => {
      if (key === 'redis.url') return 'redis://redis.prod:6379';
      if (key === 'redis.host') return 'redis.prod';
      if (key === 'redis.port') return 6380;
      if (key === 'redis.password') return 'secret';
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get(RateLimitService);
  });

  it('connects with the resolved host, port and password', async () => {
    service.onModuleInit();

    expect(mockConnections[0]).toMatchObject({
      host: 'redis.prod',
      port: 6380,
      password: 'secret',
    });
    expect(mockDefineCommand).toHaveBeenCalledWith(
      'consumeRateLimit',
      expect.objectContaining({ numberOfKeys: 1 }),
    );
    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
  });

  // With ioredis's defaults a command issued while Redis is down is buffered
  // indefinitely and then retried 20 times, so the fail-open catch is either
  // unreachable or reaches the caller seconds late. Pin the fail-fast options.
  it('rejects commands immediately while disconnected so fail-open can fire', async () => {
    service.onModuleInit();

    expect(mockConnections[0]).toMatchObject({
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      commandTimeout: RATE_LIMIT_COMMAND_TIMEOUT_MS,
    });
  });

  it('fails open when a disconnected client rejects the command', async () => {
    service.onModuleInit();
    mockConsumeRateLimit.mockRejectedValue(
      new Error(
        "Stream isn't writeable and enableOfflineQueue options is false",
      ),
    );

    await expect(service.consume('k', 5, 900)).resolves.toEqual({
      allowed: true,
      remaining: 5,
      retryAfterSeconds: 0,
    });
  });

  it('allows requests up to the limit and reports the remaining budget', async () => {
    service.onModuleInit();
    mockConsumeRateLimit.mockResolvedValue([3, 890000]);

    await expect(service.consume('k', 5, 900)).resolves.toEqual({
      allowed: true,
      remaining: 2,
      retryAfterSeconds: 0,
    });
    expect(mockConsumeRateLimit).toHaveBeenCalledWith('k', 900000);
  });

  it('treats reaching the limit as still allowed', async () => {
    service.onModuleInit();
    mockConsumeRateLimit.mockResolvedValue([5, 1000]);

    await expect(service.consume('k', 5, 900)).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    });
  });

  it('blocks past the limit and derives Retry-After from the key ttl', async () => {
    service.onModuleInit();
    mockConsumeRateLimit.mockResolvedValue([6, 421000]);

    await expect(service.consume('k', 5, 900)).resolves.toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 421,
    });
  });

  it('never reports a retry delay below one second', async () => {
    service.onModuleInit();
    mockConsumeRateLimit.mockResolvedValue([9, 120]);

    await expect(service.consume('k', 5, 900)).resolves.toMatchObject({
      allowed: false,
      retryAfterSeconds: 1,
    });
  });

  it('fails open when Redis errors so an outage cannot lock everyone out', async () => {
    service.onModuleInit();
    mockConsumeRateLimit.mockRejectedValue(new Error('NOAUTH'));

    await expect(service.consume('k', 5, 900)).resolves.toEqual({
      allowed: true,
      remaining: 5,
      retryAfterSeconds: 0,
    });
  });

  it('fails open when the client was never initialised', async () => {
    await expect(service.consume('k', 5, 900)).resolves.toEqual({
      allowed: true,
      remaining: 5,
      retryAfterSeconds: 0,
    });
    expect(mockConsumeRateLimit).not.toHaveBeenCalled();
  });

  it('quits the client on shutdown', async () => {
    service.onModuleInit();
    await service.onModuleDestroy();

    expect(mockQuit).toHaveBeenCalled();
  });
});
