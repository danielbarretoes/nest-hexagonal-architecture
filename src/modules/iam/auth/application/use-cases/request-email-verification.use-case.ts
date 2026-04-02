import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY_TOKEN } from '../../../users/application/ports/user-repository.token';
import type { UserRepositoryPort } from '../../../users/domain/ports/user.repository.port';
import { USER_ACTION_TOKEN_REPOSITORY_TOKEN } from '../ports/user-action-token-repository.token';
import type { UserActionTokenRepositoryPort } from '../../domain/ports/user-action-token.repository.port';
import { PASSWORD_HASHER_PORT } from '../../../shared/application/ports/password-hasher.token';
import type { PasswordHasherPort } from '../../../shared/domain/ports/password-hasher.port';
import { UserActionToken } from '../../domain/entities/user-action-token.entity';
import {
  EmailVerificationAlreadyCompletedException,
  UserNotFoundException,
} from '../../../shared/domain/exceptions';
import { TRANSACTIONAL_EMAIL_PORT } from '../../../../../shared/application/ports/transactional-email.token';
import { TRANSACTION_RUNNER_PORT } from '../../../../../shared/application/ports/transaction-runner.token';
import { createOpaqueToken } from '../../../../../shared/domain/security/opaque-token';
import type { TransactionalEmailPort } from '../../../../../shared/domain/ports/transactional-email.port';
import type { TransactionRunnerPort } from '../../../../../shared/domain/ports/transaction-runner.port';
import { getAppConfig } from '../../../../../config/env/app-config';

export interface RequestEmailVerificationResponse {
  verificationToken: string;
}

@Injectable()
export class RequestEmailVerificationUseCase {
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

  async execute(userId: string): Promise<RequestEmailVerificationResponse> {
    if (getAppConfig().jobs.emailDeliveryMode === 'async') {
      return this.transactionRunner.runInTransaction(async () => {
        const preparedVerification = await this.prepareEmailVerification(userId);

        await this.transactionalEmailPort.send(
          this.toEmailVerificationMessage(
            preparedVerification,
            preparedVerification.verificationToken,
          ),
        );

        return {
          verificationToken: preparedVerification.verificationToken,
        };
      });
    }

    const preparedVerification = await this.transactionRunner.runInTransaction(() =>
      this.prepareEmailVerification(userId),
    );

    await this.transactionalEmailPort.send(
      this.toEmailVerificationMessage(preparedVerification, preparedVerification.verificationToken),
    );

    return {
      verificationToken: preparedVerification.verificationToken,
    };
  }

  private async prepareEmailVerification(userId: string): Promise<{
    userEmail: string;
    recipientName: string;
    verificationToken: string;
  }> {
    const user = await this.userRepository.findById(userId, {
      includeDeleted: true,
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    if (user.isEmailVerified) {
      throw new EmailVerificationAlreadyCompletedException(user.email);
    }

    const existingToken = await this.userActionTokenRepository.findActiveByUserIdAndPurpose(
      user.id,
      'email_verification',
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
        purpose: 'email_verification',
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
    );

    return {
      userEmail: user.email,
      recipientName: user.fullName,
      verificationToken: opaqueToken.token,
    };
  }

  private toEmailVerificationMessage(
    preparedVerification: {
      userEmail: string;
      recipientName: string;
    },
    verificationToken: string,
  ) {
    return {
      type: 'email_verification' as const,
      to: preparedVerification.userEmail,
      recipientName: preparedVerification.recipientName,
      verificationToken,
      expiresInHours: 24,
    };
  }
}
