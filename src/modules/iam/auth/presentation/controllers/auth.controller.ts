/**
 * Auth controller.
 */

import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LogoutAllSessionsUseCase } from '../../application/use-cases/logout-all-sessions.use-case';
import { LogoutSessionUseCase } from '../../application/use-cases/logout-session.use-case';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.use-case';
import { RequestPasswordResetUseCase } from '../../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { RequestEmailVerificationUseCase } from '../../application/use-cases/request-email-verification.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { LoginRequestDto } from '../dto/login-request.dto';
import { LoginResponseDto } from '../dto/login-response.dto';
import { RefreshSessionRequestDto } from '../dto/refresh-session-request.dto';
import { LogoutSessionDto } from '../dto/logout-session.dto';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { RequestPasswordResetResponseDto } from '../dto/request-password-reset-response.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { RequestEmailVerificationResponseDto } from '../dto/request-email-verification-response.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { AuthRateLimitGuard } from '../guards/auth-rate-limit.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../../../../../common/http/decorators/current-user.decorator';
import type { AuthenticatedUserPayload } from '../../../../../common/http/authenticated-request';
import { getAuthRuntimeConfig } from '../../../../../config/auth/auth-runtime.config';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@UseGuards(AuthRateLimitGuard)
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutSessionUseCase: LogoutSessionUseCase,
    private readonly logoutAllSessionsUseCase: LogoutAllSessionsUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly requestEmailVerificationUseCase: RequestEmailVerificationUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
  ) {}

  @Post('login')
  @Throttle({
    auth: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a user and return a JWT access token' })
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(@Body() body: LoginRequestDto) {
    return this.loginUseCase.execute(body);
  }

  @Post('refresh')
  @Throttle({
    auth: {
      limit: 8,
      ttl: 60_000,
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token and return a new access token pair' })
  @ApiBody({ type: RefreshSessionRequestDto })
  @ApiOkResponse({ type: LoginResponseDto })
  async refresh(@Body() body: RefreshSessionRequestDto) {
    return this.refreshSessionUseCase.execute(body.refreshToken);
  }

  @Post('logout')
  @Throttle({
    auth: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific refresh session' })
  @ApiBody({ type: LogoutSessionDto })
  async logout(@Body() body: LogoutSessionDto): Promise<void> {
    await this.logoutSessionUseCase.execute(body.refreshToken);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Revoke all active refresh sessions for the authenticated user' })
  async logoutAll(@CurrentUser() user: AuthenticatedUserPayload): Promise<void> {
    await this.logoutAllSessionsUseCase.execute(user.userId);
  }

  @Post('password-reset/request')
  @Throttle({
    auth: {
      limit: 3,
      ttl: 60_000,
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset token for a user email' })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiOkResponse({ type: RequestPasswordResetResponseDto })
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    const response = await this.requestPasswordResetUseCase.execute(body.email);

    return getAuthRuntimeConfig().exposePrivateTokens ? response : {};
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset a user password using a one-time token' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() body: ResetPasswordDto): Promise<void> {
    await this.resetPasswordUseCase.execute(body.token, body.newPassword);
  }

  @Post('email-verification/request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Create a one-time email verification token for the authenticated user',
  })
  @ApiOkResponse({ type: RequestEmailVerificationResponseDto })
  async requestEmailVerification(@CurrentUser() user: AuthenticatedUserPayload) {
    const response = await this.requestEmailVerificationUseCase.execute(user.userId);

    return getAuthRuntimeConfig().exposePrivateTokens ? response : {};
  }

  @Post('email-verification/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Verify a user email using a one-time token' })
  @ApiBody({ type: VerifyEmailDto })
  async verifyEmail(@Body() body: VerifyEmailDto): Promise<void> {
    await this.verifyEmailUseCase.execute(body.token);
  }
}
