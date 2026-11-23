process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3100';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/crmpro';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ??
  'test-jwt-access-secret-at-least-32-characters';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ??
  'test-jwt-refresh-secret-at-least-32-characters';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:3002';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
