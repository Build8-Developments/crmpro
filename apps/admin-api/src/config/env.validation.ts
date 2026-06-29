import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3100),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().optional(),
  JWT_ACCESS_SECRET: Joi.string().min(1).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(1).required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('30d'),
  CORS_ORIGINS: Joi.string().optional(),
  API_VERSION: Joi.string().optional(),
});
