import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(cookieParser());
  if (config.get<boolean>('trustProxy')) {
    // Behind the web container's nginx: use X-Forwarded-For for the client IP (throttling, audit).
    app.set('trust proxy', 1);
  }

  app.enableCors({
    origin: config.get<string[]>('corsOrigins'),
    credentials: true,
  });

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

  if (config.get<string>('nodeEnv') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Ultimate Canvas API')
      .setDescription('project-ultimatecanvas API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('ucanvas_session')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
}

bootstrap();
