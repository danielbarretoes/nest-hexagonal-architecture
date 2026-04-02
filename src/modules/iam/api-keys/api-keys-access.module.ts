import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsAccessModule } from '../organizations/organizations-access.module';
import { UsersAccessModule } from '../users/users-access.module';
import { AuthenticateApiKeyUseCase } from './application/use-cases/authenticate-api-key.use-case';
import { API_KEY_AUTHENTICATOR_PORT } from './application/ports/api-key-authenticator.token';
import { API_KEY_REPOSITORY_TOKEN } from './application/ports/api-key-repository.token';
import { API_KEY_SECRET_HASHER_TOKEN } from './application/ports/api-key-secret-hasher.token';
import { HmacApiKeySecretHasherAdapter } from './infrastructure/adapters/hmac-api-key-secret-hasher.adapter';
import { ApiKeyTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/api-key.entity';
import { ApiKeyTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/api-key.typeorm-repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKeyTypeOrmEntity]),
    UsersAccessModule,
    OrganizationsAccessModule,
  ],
  providers: [
    { provide: API_KEY_REPOSITORY_TOKEN, useClass: ApiKeyTypeOrmRepository },
    { provide: API_KEY_SECRET_HASHER_TOKEN, useClass: HmacApiKeySecretHasherAdapter },
    { provide: API_KEY_AUTHENTICATOR_PORT, useExisting: AuthenticateApiKeyUseCase },
    ApiKeyTypeOrmRepository,
    HmacApiKeySecretHasherAdapter,
    AuthenticateApiKeyUseCase,
  ],
  exports: [API_KEY_REPOSITORY_TOKEN, API_KEY_SECRET_HASHER_TOKEN, API_KEY_AUTHENTICATOR_PORT],
})
export class ApiKeysAccessModule {}
