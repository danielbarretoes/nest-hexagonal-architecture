import { Inject, Injectable } from '@nestjs/common';
import { MEMBER_REPOSITORY_TOKEN } from '../../application/ports/member-repository.token';
import type { MemberRepositoryPort } from '../../domain/ports/member.repository.port';
import type { TenantAccessPort } from '../../../../../shared/domain/ports/tenant-access.port';

@Injectable()
export class TenantMembershipAccessAdapter implements TenantAccessPort {
  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN)
    private readonly memberRepository: MemberRepositoryPort,
  ) {}

  async hasAccess(
    userId: string,
    organizationId: string,
    allowedRoles?: readonly string[],
  ): Promise<boolean> {
    const member = await this.memberRepository.findByUserAndOrganization(userId, organizationId);

    if (!member) {
      return false;
    }

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    return allowedRoles.includes(member.role.name);
  }
}
