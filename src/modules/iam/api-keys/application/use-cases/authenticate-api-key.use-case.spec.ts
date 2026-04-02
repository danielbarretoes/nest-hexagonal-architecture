import { AuthenticateApiKeyUseCase } from './authenticate-api-key.use-case';
import { createApiKeyToken } from '../../domain/security/api-key-token';
import { ApiKey } from '../../domain/entities/api-key.entity';
import type { ApiKeyRepositoryPort } from '../../domain/ports/api-key.repository.port';
import type { ApiKeySecretHasherPort } from '../../domain/ports/api-key-secret-hasher.port';
import type { UserRepositoryPort } from '../../../users/domain/ports/user.repository.port';
import type { MemberRepositoryPort } from '../../../organizations/domain/ports/member.repository.port';
import type { ApiKeysRuntimeOptions } from '../ports/api-keys-runtime-options.token';

describe('AuthenticateApiKeyUseCase', () => {
  const findById = jest.fn();
  const update = jest.fn();
  const verify = jest.fn();
  const findUserById = jest.fn();
  const findByUserAndOrganization = jest.fn();

  const apiKeyRepository: ApiKeyRepositoryPort = {
    findById,
    findPaginatedByOwner: jest.fn(),
    create: jest.fn(),
    update,
  };
  const apiKeySecretHasher: ApiKeySecretHasherPort = {
    hash: jest.fn(),
    verify,
  };
  const userRepository: UserRepositoryPort = {
    findById: findUserById,
    findManyByIds: jest.fn(),
    findByEmail: jest.fn(),
    findPaginated: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    restore: jest.fn(),
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
  const apiKeysRuntimeOptions: ApiKeysRuntimeOptions = {
    nodeEnv: 'test',
    defaultTtlDays: 30,
    usageWriteIntervalMs: 60_000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for malformed tokens', async () => {
    const useCase = new AuthenticateApiKeyUseCase(
      apiKeyRepository,
      apiKeySecretHasher,
      userRepository,
      memberRepository,
      apiKeysRuntimeOptions,
    );

    await expect(useCase.authenticate('invalid-token')).resolves.toBeNull();
    expect(findById).not.toHaveBeenCalled();
  });

  it('authenticates active keys and records usage', async () => {
    const token = createApiKeyToken('test');
    const apiKey = ApiKey.create({
      id: token.id,
      organizationId: 'org-1',
      ownerUserId: 'user-1',
      name: 'Sync key',
      keyPrefix: token.keyPrefix,
      secretHash: 'hashed-secret',
      scopes: ['iam.users.read'],
      expiresAt: new Date(Date.now() + 60_000),
    });

    findById.mockResolvedValue(apiKey);
    verify.mockReturnValue(true);
    findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      isDeleted: false,
    });
    findByUserAndOrganization.mockResolvedValue({
      id: 'member-1',
    });
    update.mockImplementation(async (updatedApiKey: ApiKey) => updatedApiKey);

    const useCase = new AuthenticateApiKeyUseCase(
      apiKeyRepository,
      apiKeySecretHasher,
      userRepository,
      memberRepository,
      apiKeysRuntimeOptions,
    );

    const result = await useCase.authenticate(token.token, '127.0.0.1');

    expect(result).toEqual({
      userId: 'user-1',
      email: 'owner@example.com',
      organizationId: 'org-1',
      apiKeyId: token.id,
      apiKeyName: 'Sync key',
      scopes: ['iam.users.read'],
    });
    expect(update).toHaveBeenCalled();
  });
});
