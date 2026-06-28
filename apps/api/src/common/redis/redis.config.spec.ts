import { resolveRedisConnectionConfig, parseRedisUrl } from './redis.config';

describe('redis.config', () => {
  it('parses REDIS_URL into host, port, and password', () => {
    expect(parseRedisUrl('redis://:secret@redis.internal:6380')).toEqual({
      host: 'redis.internal',
      port: 6380,
      password: 'secret',
    });
  });

  it('prefers explicit REDIS_HOST and REDIS_PORT over URL defaults', () => {
    expect(
      resolveRedisConnectionConfig({
        REDIS_URL: 'redis://localhost:6379',
        REDIS_HOST: 'redis.prod',
        REDIS_PORT: '6380',
        REDIS_PASSWORD: 'override',
      }),
    ).toEqual({
      host: 'redis.prod',
      port: 6380,
      password: 'override',
    });
  });

  it('falls back to localhost when only REDIS_HOST is provided', () => {
    expect(
      resolveRedisConnectionConfig({
        REDIS_HOST: '127.0.0.1',
      }),
    ).toEqual({
      host: '127.0.0.1',
      port: 6379,
      password: undefined,
    });
  });
});
