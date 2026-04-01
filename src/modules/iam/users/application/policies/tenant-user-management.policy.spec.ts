import {
  CannotManageOwnUserException,
  UserManagementTargetNotAllowedException,
} from '../../../shared/domain/exceptions';
import type { MemberRepositoryPort } from '../../../organizations/domain/ports/member.repository.port';
import { TenantUserManagementPolicy } from './tenant-user-management.policy';

describe('TenantUserManagementPolicy', () => {
  const findByUserAndOrganization = jest.fn();
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects attempts to manage the authenticated user', async () => {
    const policy = new TenantUserManagementPolicy(memberRepository);

    await expect(policy.assertCanManageTargetUser('user-1', 'user-1', 'org-1')).rejects.toThrow(
      CannotManageOwnUserException,
    );
  });

  it('rejects targets without a membership in the scoped organization', async () => {
    const policy = new TenantUserManagementPolicy(memberRepository);
    findByUserAndOrganization.mockResolvedValue(null);

    await expect(policy.assertCanManageTargetUser('owner-1', 'user-2', 'org-1')).rejects.toThrow(
      UserManagementTargetNotAllowedException,
    );
  });

  it('allows management when the target belongs to the scoped organization', async () => {
    const policy = new TenantUserManagementPolicy(memberRepository);
    findByUserAndOrganization.mockResolvedValue({ id: 'member-1' });

    await expect(policy.assertCanManageTargetUser('owner-1', 'user-2', 'org-1')).resolves.toBe(
      undefined,
    );
  });
});
