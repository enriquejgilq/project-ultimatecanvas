import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),
  CORS_ORIGINS: Joi.string().required(),

  // Signs the short-lived access token. Sessions themselves are opaque, DB-backed tokens.
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),

  // Postgres connection string consumed by PrismaService. Required.
  DATABASE_URL: Joi.string()
    .uri({ scheme: [/postgres(ql)?/] })
    .required(),

  // Base URL of the web app — used to build the links sent by email.
  APP_WEB_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),

  // "console" logs emails (links included) and is therefore forbidden in production.
  MAIL_TRANSPORT: Joi.string()
    .valid('console', 'smtp')
    .default('console')
    .when('NODE_ENV', { is: 'production', then: Joi.valid('smtp') }),
  SMTP_URL: Joi.string()
    .uri({ scheme: ['smtp', 'smtps'] })
    .when('MAIL_TRANSPORT', { is: 'smtp', then: Joi.required() }),
  MAIL_FROM: Joi.string().required(),

  // Set to true behind a reverse proxy so the real client IP is used for throttling/auditing.
  TRUST_PROXY: Joi.boolean().default(false),
});
