import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().optional(),
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().port().optional(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  BULL_PREFIX: Joi.string().default('crmpro'),
  BULL_IMPORT_CONCURRENCY: Joi.number().integer().min(1).optional(),
  BULL_EXPORT_CONCURRENCY: Joi.number().integer().min(1).optional(),
  BULL_JOB_ATTEMPTS: Joi.number().integer().min(1).optional(),
  BULL_JOB_BACKOFF_DELAY_MS: Joi.number().integer().min(1).optional(),
  JWT_ACCESS_SECRET: Joi.string().min(1).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
  JWT_REFRESH_EXPIRATION: Joi.string().optional(),
  CORS_ORIGINS: Joi.string().required(),
  AWS_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_S3_BUCKET: Joi.string().required(),
  AWS_S3_ENDPOINT: Joi.string().uri().optional(),
}).or('REDIS_URL', 'REDIS_HOST');
