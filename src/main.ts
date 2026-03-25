/**
 * Application Bootstrap
 * Initializes the NestJS application with global middleware and pipes.
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { configureHttpApplication } from './app.setup';
import { loadEnvironment } from './config/env/load-env';
import { isSwaggerEnabled } from './config/swagger/swagger.config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const runtimeEnvironment = loadEnvironment();

  const app = await NestFactory.create(AppModule);
  configureHttpApplication(app);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(
    `Environment: ${runtimeEnvironment}, database: ${process.env.DB_DATABASE ?? 'hexagonal_db'}`,
  );

  if (isSwaggerEnabled()) {
    logger.log(`Swagger UI is running on: http://localhost:${port}/docs`);
  }
}

void bootstrap();
