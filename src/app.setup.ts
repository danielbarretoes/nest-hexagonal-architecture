import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/http/filters/http-exception.filter';
import { configureSwagger } from './config/swagger/swagger.config';

export function configureHttpApplication(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
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
