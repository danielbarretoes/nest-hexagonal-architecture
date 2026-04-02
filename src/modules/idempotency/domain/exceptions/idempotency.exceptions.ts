import { DomainException } from '../../../../shared/domain/exceptions';

export class IdempotencyKeyReuseConflictException extends DomainException {
  constructor(idempotencyKey: string) {
    super(
      `Idempotency key ${idempotencyKey} was already used with a different request payload`,
      'IDEMPOTENCY_KEY_REUSE_CONFLICT',
    );
  }
}

export class IdempotencyRequestInProgressException extends DomainException {
  constructor(idempotencyKey: string) {
    super(
      `Idempotent request ${idempotencyKey} is still being processed`,
      'IDEMPOTENCY_REQUEST_IN_PROGRESS',
    );
  }
}
