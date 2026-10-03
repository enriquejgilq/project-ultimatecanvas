export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  appWebUrl: (process.env.APP_WEB_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  mail: {
    transport: (process.env.MAIL_TRANSPORT ?? 'console') as 'console' | 'smtp',
    smtpUrl: process.env.SMTP_URL,
    from: process.env.MAIL_FROM ?? 'UltimateCanvas <no-reply@localhost>',
  },
  trustProxy: process.env.TRUST_PROXY === 'true',
});
