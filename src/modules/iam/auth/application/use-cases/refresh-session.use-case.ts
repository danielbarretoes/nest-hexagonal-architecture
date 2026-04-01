import { Inject, Injectable } from '@nestjs/common';
import { AUTH_SESSION_REPOSITORY_TOKEN } from '../ports/auth-session-repository.token';
import type { AuthSessionRepositoryPort } from '../../domain/ports/auth-session.repository.port';
import { USER_REPOSITORY_TOKEN } from '../../../users/application/ports/user-repository.token';
import type { UserRepositoryPort } from '../../../users/domain/ports/user.repository.port';
import { JWT_TOKEN_PORT } from '../ports/jwt-token.token';
import type { JwtTokenPort } from '../../domain/ports/jwt-token.port';
import { PASSWORD_HASHER_PORT } from '../../../shared/application/ports/password-hasher.token';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';
import { AuthSession } from '../../domain/entities/auth-session.entity';
import { SessionNotFoundException, UserNotFoundException } from '../../../shared/domain/exceptions';
import { parseOpaqueToken } from '../../../../../shared/domain/security/opaque-token';
import { getAuthRuntimeConfig } from '../../../../../config/auth/auth-runtime.config';

export interface RefreshSessionResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(AUTH_SESSION_REPOSITORY_TOKEN)
    private readonly authSessionRepository: AuthSessionRepositoryPort,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    @Inject(JWT_TOKEN_PORT)
    private readonly jwtTokenPort: JwtTokenPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(refreshToken: string): Promise<RefreshSessionResponse> {
    const tokenParts = parseOpaqueToken(refreshToken);

    if (!tokenParts) {
      throw new SessionNotFoundException();
    }

    const session = await this.authSessionRepository.findById(tokenParts.id);

    if (!session || !session.isActive) {
      throw new SessionNotFoundException();
    }

    const tokenMatches = await this.passwordHasher.compare(
      tokenParts.secret,
      session.refreshTokenHash,
    );

    if (!tokenMatches) {
      throw new SessionNotFoundException();
    }

    const user = await this.userRepository.findById(session.userId);

    if (!user) {
      throw new UserNotFoundException(session.userId);
    }

    const nextSecret = crypto.randomUUID();
    const nextTokenHash = await this.passwordHasher.hash(nextSecret);
    const rotatedSession = session.rotate(
      nextTokenHash,
      new Date(Date.now() + getAuthRuntimeConfig().refreshSessionTtlMs),
    );

    await this.authSessionRepository.update(rotatedSession);

    return {
      accessToken: this.jwtTokenPort.generateToken({
        userId: user.id,
        email: user.email,
      }),
      refreshToken: `${session.id}.${nextSecret}`,
      userId: user.id,
      email: user.email,
    };
  }

  static createSession(
    id: string,
    userId: string,
    refreshTokenHash: string,
    ttlMs: number,
  ): AuthSession {
    return AuthSession.create({
      id,
      userId,
      refreshTokenHash,
      expiresAt: new Date(Date.now() + ttlMs),
    });
  }
}
