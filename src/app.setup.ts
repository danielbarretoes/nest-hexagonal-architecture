import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/http/filters/http-exception.filter';
import { getAppConfig } from './config/env/app-config';
import { configureSwagger } from './config/swagger/swagger.config';

export function configureHttpApplication(app: INestApplication): void {
  const config = getAppConfig();
  const expressApp = app as NestExpressApplication;

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  if (config.http.helmetEnabled) {
    app.use(
      helmet({
        crossOriginResourcePolicy: false,
      }),
    );
  }

  if (config.http.corsEnabled) {
    app.enableCors({
      origin: config.http.corsOrigins,
    });
  }

  expressApp.useBodyParser('json', {
    limit: config.http.bodyLimit,
  });
  expressApp.useBodyParser('urlencoded', {
    extended: true,
    limit: config.http.bodyLimit,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  configureSwagger(app);
}
