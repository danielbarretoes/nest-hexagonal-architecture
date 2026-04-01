import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getAppConfig } from '../env/app-config';

export function isSwaggerEnabled(): boolean {
  return getAppConfig().swaggerEnabled;
}

export function configureSwagger(app: INestApplication): void {
  if (!isSwaggerEnabled()) {
    return;
  }

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Hexagonal IAM Template API')
      .setDescription(
        'Hexagonal NestJS template with IAM, organizations, auth, RFC 7807 problem details, HTTP logs, and PostgreSQL persistence.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste the access token returned by POST /api/v1/auth/login',
        },
        'bearer',
      )
      .build(),
  );

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
