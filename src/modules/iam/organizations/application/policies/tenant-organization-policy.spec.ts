import { OrganizationScopeMismatchException } from '../../../shared/domain/exceptions';
import { TenantOrganizationPolicy } from './tenant-organization-policy';

describe('TenantOrganizationPolicy', () => {
  const policy = new TenantOrganizationPolicy();

  it('allows organization operations inside the scoped tenant', () => {
    expect(() => policy.assertMatchesScope('org-1', 'org-1')).not.toThrow();
  });

  it('rejects organization operations outside the scoped tenant', () => {
    expect(() => policy.assertMatchesScope('org-1', 'org-2')).toThrow(
      OrganizationScopeMismatchException,
    );
  });
});
