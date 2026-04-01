/**
 * Login Use Case
 * Authenticates user and returns JWT token.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserRepositoryPort } from '../../../users/domain/ports/user.repository.port';
import { USER_REPOSITORY_TOKEN } from '../../../users/application/ports/user-repository.token';
import { JWT_TOKEN_PORT } from '../ports/jwt-token.token';
import { PASSWORD_HASHER_PORT } from '../../../shared/application/ports/password-hasher.token';
import type { JwtTokenPort } from '../../domain/ports';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';
import { InvalidCredentialsException } from '../../../shared/domain/exceptions';
import { AUTH_SESSION_REPOSITORY_TOKEN } from '../ports/auth-session-repository.token';
import type { AuthSessionRepositoryPort } from '../../domain/ports/auth-session.repository.port';
import { createOpaqueToken } from '../../../../../shared/domain/security/opaque-token';
import { RefreshSessionUseCase } from './refresh-session.use-case';
import { getAuthRuntimeConfig } from '../../../../../config/auth/auth-runtime.config';

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    @Inject(JWT_TOKEN_PORT)
    private readonly jwtTokenPort: JwtTokenPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(AUTH_SESSION_REPOSITORY_TOKEN)
    private readonly authSessionRepository: AuthSessionRepositoryPort,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResponse> {
    const user = await this.userRepository.findByEmail(command.email);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isValidPassword = await this.passwordHasher.compare(command.password, user.passwordHash);

    if (!isValidPassword) {
      throw new InvalidCredentialsException();
    }

    const opaqueRefreshToken = createOpaqueToken();
    const refreshTokenHash = await this.passwordHasher.hash(opaqueRefreshToken.secret);
    const session = RefreshSessionUseCase.createSession(
      opaqueRefreshToken.id,
      user.id,
      refreshTokenHash,
      getAuthRuntimeConfig().refreshSessionTtlMs,
    );
    await this.authSessionRepository.create(session);

    const token = this.jwtTokenPort.generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      accessToken: token,
      refreshToken: opaqueRefreshToken.token,
      userId: user.id,
      email: user.email,
    };
  }
}
