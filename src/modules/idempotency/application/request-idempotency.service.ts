import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  BeginIdempotentRequestCommand,
  BeginIdempotentRequestResult,
  CompleteIdempotentRequestCommand,
  ReleaseIdempotentRequestCommand,
  RequestIdempotencyPort,
} from '../../../shared/domain/ports/request-idempotency.port';
import {
  IdempotencyKeyReuseConflictException,
  IdempotencyRequestInProgressException,
} from '../domain/exceptions/idempotency.exceptions';
import { IDEMPOTENT_REQUEST_REPOSITORY_TOKEN } from './ports/idempotent-request-repository.token';
import type { IdempotentRequestRepositoryPort } from '../domain/ports/idempotent-request.repository.port';
import { IdempotentRequest } from '../domain/entities/idempotent-request.entity';

@Injectable()
export class RequestIdempotencyService implements RequestIdempotencyPort {
  constructor(
    @Inject(IDEMPOTENT_REQUEST_REPOSITORY_TOKEN)
    private readonly repository: IdempotentRequestRepositoryPort,
  ) {}

  async begin(command: BeginIdempotentRequestCommand): Promise<BeginIdempotentRequestResult> {
    const createdRequest = await this.repository.createPending(
      IdempotentRequest.create({
        id: randomUUID(),
        idempotencyKey: command.idempotencyKey,
        scopeKey: command.scopeKey,
        method: command.method,
        routeKey: command.routeKey,
        requestHash: command.requestHash,
      }),
    );

    if (createdRequest) {
      return {
        outcome: 'started',
        requestId: createdRequest.id,
      };
    }

    const existingRequest = await this.repository.findByUnique(
      command.scopeKey,
      command.idempotencyKey,
      command.method,
      command.routeKey,
    );

    if (!existingRequest) {
      throw new IdempotencyRequestInProgressException(command.idempotencyKey);
    }

    if (existingRequest.requestHash !== command.requestHash) {
      throw new IdempotencyKeyReuseConflictException(command.idempotencyKey);
    }

    if (existingRequest.status === 'completed' && existingRequest.responseStatusCode !== null) {
      return {
        outcome: 'replay',
        response: {
          statusCode: existingRequest.responseStatusCode,
          body: existingRequest.responseBody,
        },
      };
    }

    throw new IdempotencyRequestInProgressException(command.idempotencyKey);
  }

  async complete(command: CompleteIdempotentRequestCommand): Promise<void> {
    const existingRequest = await this.repository.findById(command.requestId);

    if (!existingRequest || existingRequest.status === 'completed') {
      return;
    }

    await this.repository.update(existingRequest.complete(command.statusCode, command.body));
  }

  async release(command: ReleaseIdempotentRequestCommand): Promise<void> {
    await this.repository.deletePending(command.requestId);
  }
}
