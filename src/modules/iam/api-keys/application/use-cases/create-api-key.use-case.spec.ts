import { CreateApiKeyUseCase } from './create-api-key.use-case';
import { ApiKey } from '../../domain/entities/api-key.entity';
import type { ApiKeyRepositoryPort } from '../../domain/ports/api-key.repository.port';
import type { ApiKeySecretHasherPort } from '../../domain/ports/api-key-secret-hasher.port';
import type { MemberRepositoryPort } from '../../../organizations/domain/ports/member.repository.port';
import type { AdminAuditPort } from '../../../../../shared/domain/ports/admin-audit.port';
import type { TransactionRunnerPort } from '../../../../../shared/domain/ports/transaction-runner.port';
import type { WebhookEventPublisherPort } from '../../../../../shared/domain/ports/webhook-event-publisher.port';
import { InvalidApiKeyScopesException } from '../../../shared/domain/exceptions';

describe('CreateApiKeyUseCase', () => {
  const create = jest.fn();
  const findByUserAndOrganization = jest.fn();
  const record = jest.fn();
  const hash = jest.fn();
  const runInTransaction = jest.fn();
  const publish = jest.fn();

  const apiKeyRepository: ApiKeyRepositoryPort = {
    findById: jest.fn(),
    findPaginatedByOwner: jest.fn(),
    create,
    update: jest.fn(),
  };
  const apiKeySecretHasher: ApiKeySecretHasherPort = {
    hash,
    verify: jest.fn(),
  };
  const memberRepository: MemberRepositoryPort = {
    findById: jest.fn(),
    findByUserAndOrganization,
    findByUser: jest.fn(),
    findByOrganization: jest.fn(),
    findPaginated: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const adminAuditPort: AdminAuditPort = {
    record,
  };
  const transactionRunner: TransactionRunnerPort = {
    runInTransaction,
  };
  const webhookEventPublisher: WebhookEventPublisherPort = {
    publish,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    runInTransaction.mockImplementation(async (operation: () => Promise<unknown>) => operation());
    publish.mockResolvedValue(undefined);
  });

  it('creates a key with the membership permissions when scopes are omitted', async () => {
    findByUserAndOrganization.mockResolvedValue({
      role: {
        permissions: ['iam.users.read', 'iam.members.read'],
      },
    });
    hash.mockReturnValue('hashed-secret');
    create.mockImplementation(async (apiKey: ApiKey) => apiKey);

    const useCase = new CreateApiKeyUseCase(
      apiKeyRepository,
      apiKeySecretHasher,
      memberRepository,
      adminAuditPort,
      transactionRunner,
      webhookEventPublisher,
    );

    const response = await useCase.execute({
      organizationId: 'org-1',
      ownerUserId: 'user-1',
      name: 'Sync key',
    });

    expect(response.apiKey).toEqual(expect.stringContaining('.'));
    expect(response.scopes).toEqual(['iam.users.read', 'iam.members.read']);
    expect(create).toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'iam.api_key.created',
        organizationId: 'org-1',
      }),
    );
  });

  it('rejects scopes outside the current membership permissions', async () => {
    findByUserAndOrganization.mockResolvedValue({
      role: {
        permissions: ['iam.members.read'],
      },
    });

    const useCase = new CreateApiKeyUseCase(
      apiKeyRepository,
      apiKeySecretHasher,
      memberRepository,
      adminAuditPort,
      transactionRunner,
      webhookEventPublisher,
    );

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        ownerUserId: 'user-1',
        name: 'Sync key',
        scopes: ['iam.users.read'],
      }),
    ).rejects.toThrow(InvalidApiKeyScopesException);
  });
});
