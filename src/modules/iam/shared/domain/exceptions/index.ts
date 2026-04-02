/**
 * IAM shared domain exceptions.
 * These business exceptions are reused by multiple IAM features and therefore
 * live in the bounded context shared kernel instead of a fake top-level domain folder.
 */

import { DomainException } from '../../../../../shared/domain/exceptions/domain.exception';

export class UserAlreadyExistsException extends DomainException {
  constructor(email: string) {
    super(`User with email ${email} already exists`, 'USER_ALREADY_EXISTS');
  }
}

export class UserNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`, 'USER_NOT_FOUND');
  }
}

export class UserManagementTargetNotAllowedException extends DomainException {
  constructor(userId: string, organizationId: string) {
    super(
      `User ${userId} cannot be managed within organization ${organizationId}`,
      'USER_MANAGEMENT_TARGET_NOT_ALLOWED',
    );
  }
}

export class CannotManageOwnUserException extends DomainException {
  constructor(userId: string) {
    super(
      `User ${userId} cannot be managed through tenant administration`,
      'CANNOT_MANAGE_OWN_USER',
    );
  }
}

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS');
  }
}

export class SessionNotFoundException extends DomainException {
  constructor() {
    super('Refresh session is invalid or expired', 'SESSION_NOT_FOUND');
  }
}

export class ActionTokenNotFoundException extends DomainException {
  constructor(purpose: string) {
    super(`${purpose} token is invalid or expired`, 'ACTION_TOKEN_NOT_FOUND');
  }
}

export class EmailVerificationAlreadyCompletedException extends DomainException {
  constructor(email: string) {
    super(`Email ${email} is already verified`, 'EMAIL_VERIFICATION_ALREADY_COMPLETED');
  }
}

export class OrganizationAlreadyExistsException extends DomainException {
  constructor(name: string) {
    super(`Organization with name ${name} already exists`, 'ORGANIZATION_ALREADY_EXISTS');
  }
}

export class InvalidOrganizationNameException extends DomainException {
  constructor() {
    super('Organization name must be between 2 and 100 characters', 'INVALID_ORGANIZATION_NAME');
  }
}

export class OrganizationNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`Organization not found: ${identifier}`, 'ORGANIZATION_NOT_FOUND');
  }
}

export class OrganizationScopeMismatchException extends DomainException {
  constructor(organizationId: string, scopedOrganizationId: string) {
    super(
      `Organization ${organizationId} does not match scoped tenant ${scopedOrganizationId}`,
      'ORGANIZATION_SCOPE_MISMATCH',
    );
  }
}

export class MemberNotFoundException extends DomainException {
  constructor(userId: string, organizationId: string) {
    super(
      `Member not found for user ${userId} in organization ${organizationId}`,
      'MEMBER_NOT_FOUND',
    );
  }
}

export class MemberByIdNotFoundException extends DomainException {
  constructor(memberId: string) {
    super(`Member not found: ${memberId}`, 'MEMBER_NOT_FOUND');
  }
}

export class MemberAlreadyExistsException extends DomainException {
  constructor(userId: string, organizationId: string) {
    super(
      `Member already exists for user ${userId} in organization ${organizationId}`,
      'MEMBER_ALREADY_EXISTS',
    );
  }
}

export class LastOwnerRemovalNotAllowedException extends DomainException {
  constructor(organizationId: string) {
    super(
      `Cannot remove the last owner from organization ${organizationId}`,
      'LAST_OWNER_REMOVAL_NOT_ALLOWED',
    );
  }
}

export class LastOwnerRoleChangeNotAllowedException extends DomainException {
  constructor(organizationId: string) {
    super(
      `Cannot change the role of the last owner in organization ${organizationId}`,
      'LAST_OWNER_ROLE_CHANGE_NOT_ALLOWED',
    );
  }
}

export class InvalidMembershipRoleException extends DomainException {
  constructor(role: string) {
    super(`Invalid membership role: ${role}`, 'INVALID_MEMBERSHIP_ROLE');
  }
}

export class RoleNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`Role not found: ${identifier}`, 'ROLE_NOT_FOUND');
  }
}

export class OrganizationInvitationNotFoundException extends DomainException {
  constructor() {
    super('Organization invitation is invalid or expired', 'ORGANIZATION_INVITATION_NOT_FOUND');
  }
}

export class OrganizationInvitationAlreadyExistsException extends DomainException {
  constructor(email: string, organizationId: string) {
    super(
      `Organization invitation already exists for ${email} in organization ${organizationId}`,
      'ORGANIZATION_INVITATION_ALREADY_EXISTS',
    );
  }
}

export class InvitationEmailMismatchException extends DomainException {
  constructor(email: string) {
    super(
      `Authenticated user email does not match invitation email ${email}`,
      'INVITATION_EMAIL_MISMATCH',
    );
  }
}

export class ApiKeyNotFoundException extends DomainException {
  constructor(identifier: string) {
    super(`API key not found: ${identifier}`, 'API_KEY_NOT_FOUND');
  }
}

export class InvalidApiKeyScopesException extends DomainException {
  constructor() {
    super(
      'Requested API key scopes must be a subset of the authenticated membership permissions',
      'INVALID_API_KEY_SCOPES',
    );
  }
}
