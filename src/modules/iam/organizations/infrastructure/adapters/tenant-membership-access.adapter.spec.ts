import { TenantMembershipAccessAdapter } from './tenant-membership-access.adapter';
import { MembershipRole } from '../../domain/value-objects/membership-role.value-object';
import type { MemberRepositoryPort } from '../../domain/ports/member.repository.port';

describe('TenantMembershipAccessAdapter', () => {
  const findByUserAndOrganization = jest.fn();
  const memberRepository: MemberRepositoryPort = {
    save: jest.fn(),
    findById: jest.fn(),
    findByUserAndOrganization,
    findPaginated: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when the user is not a member of the tenant', async () => {
    const adapter = new TenantMembershipAccessAdapter(memberRepository);
    findByUserAndOrganization.mockResolvedValue(null);

    await expect(adapter.hasAccess('user-1', 'org-1')).resolves.toBe(false);
  });

  it('returns true for any membership when no role restriction is provided', async () => {
    const adapter = new TenantMembershipAccessAdapter(memberRepository);
    findByUserAndOrganization.mockResolvedValue({
      role: MembershipRole.create('member'),
    });

    await expect(adapter.hasAccess('user-1', 'org-1')).resolves.toBe(true);
  });

  it('returns true when the member role matches the allowed roles', async () => {
    const adapter = new TenantMembershipAccessAdapter(memberRepository);
    findByUserAndOrganization.mockResolvedValue({
      role: MembershipRole.create('admin'),
    });

    await expect(adapter.hasAccess('user-1', 'org-1', ['owner', 'admin'])).resolves.toBe(true);
  });

  it('returns false when the member role does not match the allowed roles', async () => {
    const adapter = new TenantMembershipAccessAdapter(memberRepository);
    findByUserAndOrganization.mockResolvedValue({
      role: MembershipRole.create('member'),
    });

    await expect(adapter.hasAccess('user-1', 'org-1', ['owner', 'admin'])).resolves.toBe(false);
  });
});
