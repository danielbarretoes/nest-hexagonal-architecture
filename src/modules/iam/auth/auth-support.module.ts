/**
 * Auth Support Module
 * Exposes technical authentication services that can be reused by other IAM features
 * without coupling them to login-specific application flows.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getAuthRuntimeConfig } from '../../../config/auth/auth-runtime.config';
import { getJwtConfig } from '../../../config/auth/jwt.config';
import { ApiKeysAccessModule } from '../api-keys/api-keys-access.module';
import { JWT_TOKEN_PORT } from './application/ports/jwt-token.token';
import { PASSWORD_HASHER_PORT } from './application/ports/password-hasher.token';
import { AUTH_SESSION_REPOSITORY_TOKEN } from './application/ports/auth-session-repository.token';
import { USER_ACTION_TOKEN_REPOSITORY_TOKEN } from './application/ports/user-action-token-repository.token';
import { JwtTokenAdapter } from './infrastructure/adapters/jwt-token.adapter';
import { BcryptPasswordHasherAdapter } from './infrastructure/adapters/bcrypt-password-hasher.adapter';
import { AccessAuthGuard } from './presentation/guards/access-auth.guard';
import { AuthRateLimitGuard } from './presentation/guards/auth-rate-limit.guard';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { AuthSessionTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/auth-session.entity';
import { UserActionTokenTypeOrmEntity } from './infrastructure/persistence/typeorm/entities/user-action-token.entity';
import { AuthSessionTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/auth-session.typeorm-repository';
import { UserActionTokenTypeOrmRepository } from './infrastructure/persistence/typeorm/repositories/user-action-token.typeorm-repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthSessionTypeOrmEntity, UserActionTokenTypeOrmEntity]),
    ApiKeysAccessModule,
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const authConfig = getAuthRuntimeConfig();

        return {
          skipIf: () => !authConfig.rateLimitingEnabled,
          throttlers: [
            {
              name: 'auth',
              ttl: authConfig.rateLimitTtlMs,
              limit: authConfig.rateLimitLimit,
            },
          ],
        };
      },
    }),
    JwtModule.registerAsync({
      useFactory: () => {
        const jwtConfig = getJwtConfig();

        return {
          secret: jwtConfig.secret,
          signOptions: { expiresIn: jwtConfig.expiresIn },
        };
      },
    }),
  ],
  providers: [
    { provide: JWT_TOKEN_PORT, useClass: JwtTokenAdapter },
    { provide: PASSWORD_HASHER_PORT, useClass: BcryptPasswordHasherAdapter },
    { provide: AUTH_SESSION_REPOSITORY_TOKEN, useClass: AuthSessionTypeOrmRepository },
    { provide: USER_ACTION_TOKEN_REPOSITORY_TOKEN, useClass: UserActionTokenTypeOrmRepository },
    JwtTokenAdapter,
    BcryptPasswordHasherAdapter,
    AuthSessionTypeOrmRepository,
    UserActionTokenTypeOrmRepository,
    AccessAuthGuard,
    AuthRateLimitGuard,
    JwtAuthGuard,
  ],
  exports: [
    JWT_TOKEN_PORT,
    ApiKeysAccessModule,
    PASSWORD_HASHER_PORT,
    AUTH_SESSION_REPOSITORY_TOKEN,
    USER_ACTION_TOKEN_REPOSITORY_TOKEN,
    AccessAuthGuard,
    AuthRateLimitGuard,
    JwtAuthGuard,
  ],
})
export class AuthSupportModule {}
