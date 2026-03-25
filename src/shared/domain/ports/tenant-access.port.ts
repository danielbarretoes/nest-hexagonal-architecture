export interface TenantAccessPort {
  hasAccess(
    userId: string,
    organizationId: string,
    allowedRoles?: readonly string[],
  ): Promise<boolean>;
}
