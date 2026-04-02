import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY_TOKEN } from '../../../users/application/ports/user-repository.token';
import type { UserRepositoryPort } from '../../../users/domain/ports/user.repository.port';
import { USER_ACTION_TOKEN_REPOSITORY_TOKEN } from '../ports/user-action-token-repository.token';
import type { UserActionTokenRepositoryPort } from '../../domain/ports/user-action-token.repository.port';
import { PASSWORD_HASHER_PORT } from '../../../shared/application/ports/password-hasher.token';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';
import { UserActionToken } from '../../domain/entities/user-action-token.entity';
import { ActionTokenNotFoundException } from '../../../shared/domain/exceptions';
import { TRANSACTIONAL_EMAIL_PORT } from '../../../../../shared/application/ports/transactional-email.token';
import { TRANSACTION_RUNNER_PORT } from '../../../../../shared/application/ports/transaction-runner.token';
import { createOpaqueToken } from '../../../../../shared/domain/security/opaque-token';
import type { TransactionalEmailPort } from '../../../../../shared/domain/ports/transactional-email.port';
import type { TransactionRunnerPort } from '../../../../../shared/domain/ports/transaction-runner.port';
import { getAppConfig } from '../../../../../config/env/app-config';

export interface RequestPasswordResetResponse {
  resetToken: string;
}

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
    @Inject(USER_ACTION_TOKEN_REPOSITORY_TOKEN)
    private readonly userActionTokenRepository: UserActionTokenRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(TRANSACTIONAL_EMAIL_PORT)
    private readonly transactionalEmailPort: TransactionalEmailPort,
    @Inject(TRANSACTION_RUNNER_PORT)
    private readonly transactionRunner: TransactionRunnerPort,
  ) {}

  async execute(email: string): Promise<RequestPasswordResetResponse> {
    if (getAppConfig().jobs.emailDeliveryMode === 'async') {
      return this.transactionRunner.runInTransaction(async () => {
        const preparedReset = await this.preparePasswordReset(email);

        await this.transactionalEmailPort.send(
          this.toPasswordResetMessage(preparedReset, preparedReset.resetToken),
        );

        return {
          resetToken: preparedReset.resetToken,
        };
      });
    }

    const preparedReset = await this.transactionRunner.runInTransaction(() =>
      this.preparePasswordReset(email),
    );

    await this.transactionalEmailPort.send(
      this.toPasswordResetMessage(preparedReset, preparedReset.resetToken),
    );

    return {
      resetToken: preparedReset.resetToken,
    };
  }

  private async preparePasswordReset(email: string): Promise<{
    userEmail: string;
    recipientName: string;
    resetToken: string;
  }> {
    const user = await this.userRepository.findByEmail(email, {
      includeDeleted: true,
    });

    if (!user || user.isDeleted) {
      throw new ActionTokenNotFoundException('password reset');
    }

    const existingToken = await this.userActionTokenRepository.findActiveByUserIdAndPurpose(
      user.id,
      'password_reset',
    );

    if (existingToken) {
      await this.userActionTokenRepository.update(existingToken.consume());
    }

    const opaqueToken = createOpaqueToken();
    const tokenHash = await this.passwordHasher.hash(opaqueToken.secret);

    await this.userActionTokenRepository.create(
      UserActionToken.create({
        id: opaqueToken.id,
        userId: user.id,
        purpose: 'password_reset',
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      }),
    );

    return {
      userEmail: user.email,
      recipientName: user.fullName,
      resetToken: opaqueToken.token,
    };
  }

  private toPasswordResetMessage(
    preparedReset: {
      userEmail: string;
      recipientName: string;
    },
    resetToken: string,
  ) {
    return {
      type: 'password_reset' as const,
      to: preparedReset.userEmail,
      recipientName: preparedReset.recipientName,
      resetToken,
      expiresInMinutes: 15,
    };
  }
}
