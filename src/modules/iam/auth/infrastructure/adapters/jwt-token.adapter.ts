/**
 * JWT Token Adapter
 * Implements JwtTokenPort using @nestjs/jwt.
 */

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtTokenPort } from '../../domain/ports/jwt-token.port';
import { getJwtConfig } from '../../../../../config/auth/jwt.config';

@Injectable()
export class JwtTokenAdapter implements JwtTokenPort {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(payload: { userId: string; email: string }): string {
    const jwtConfig = getJwtConfig();

    return this.jwtService.sign(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.expiresIn,
    });
  }

  verifyToken(token: string): { userId: string; email: string } | null {
    try {
      const jwtConfig = getJwtConfig();
      const payload = this.jwtService.verify<{ userId: string; email: string }>(token, {
        secret: jwtConfig.secret,
      });
      return { userId: payload.userId, email: payload.email };
    } catch {
      return null;
    }
  }
}
