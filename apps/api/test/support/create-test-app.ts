import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { MAILER } from '../../src/modules/auth/application/ports/mailer.port';
import {
  MAIL_RETRY_DELAYS,
  MailDispatcher,
} from '../../src/modules/auth/infrastructure/mail/mail-dispatcher';
import { CapturingMailer } from '../../src/modules/auth/infrastructure/mail/capturing-mailer';
import { resetDatabase } from './reset-db';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  mailer: CapturingMailer;
  /** Waits until every queued email has been "sent" to the capturing mailer. */
  flushEmails(): Promise<void>;
  reset(): Promise<void>;
  close(): Promise<void>;
}

/** Boots AppModule exactly like main.ts (prefix, versioning, pipes, cookies) with a capturing mailer. */
export async function createTestApp(): Promise<TestApp> {
  const mailer = new CapturingMailer();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MAILER)
    .useValue(mailer)
    .overrideProvider(MAIL_RETRY_DELAYS)
    .useValue([0, 0, 0])
    .compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();

  const prisma = app.get(PrismaService);
  const dispatcher = app.get(MailDispatcher);

  return {
    app,
    prisma,
    mailer,
    flushEmails: () => dispatcher.drain(),
    async reset() {
      await dispatcher.drain();
      await resetDatabase(prisma);
      mailer.clear();
    },
    close: () => app.close(),
  };
}
