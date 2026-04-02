import type { IdempotentRequest } from '../entities/idempotent-request.entity';

export interface IdempotentRequestRepositoryPort {
  findById(id: string): Promise<IdempotentRequest | null>;
  createPending(request: IdempotentRequest): Promise<IdempotentRequest | null>;
  findByUnique(
    scopeKey: string,
    idempotencyKey: string,
    method: string,
    routeKey: string,
  ): Promise<IdempotentRequest | null>;
  update(request: IdempotentRequest): Promise<IdempotentRequest>;
  deletePending(requestId: string): Promise<void>;
}
