import { Organization } from '../../domain/entities/organization.entity';
import { CreateOrganizationInvitationUseCase } from './create-organization-invitation.use-case';

describe('CreateOrganizationInvitationUseCase', () => {
  const findByCode = jest.fn();
  const findById = jest.fn();
  const hash = jest.fn();
  const findByEmail = jest.fn();
  const findByUserAndOrganization = jest.fn();
  const findActiveByOrganizationAndEmail = jest.fn();
  const create = jest.fn();
  const record = jest.fn();
  const send = jest.fn();
  const runInTransaction = jest.fn();
  const publish = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    findByCode.mockResolvedValue({ id: 'role-1' });
    findById.mockResolvedValue(
      Organization.create({
        id: 'org-1',
        name: 'Acme',
      }),
    );
    hash.mockResolvedValue('hashed-token');
    findByEmail.mockResolvedValue(null);
    findByUserAndOrganization.mockResolvedValue(null);
    findActiveByOrganizationAndEmail.mockResolvedValue(null);
    create.mockResolvedValue(undefined);
    record.mockResolvedValue(undefined);
    send.mockResolvedValue(undefined);
    runInTransaction.mockImplementation(async (operation: () => Promise<unknown>) => operation());
    publish.mockResolvedValue(undefined);
  });

  it('creates an invitation and sends an email with the organization context', async () => {
    const useCase = new CreateOrganizationInvitationUseCase(
      {
        findActiveByOrganizationAndEmail,
        create,
      } as never,
      { findByCode } as never,
      { findById } as never,
      { hash } as never,
      { findByUserAndOrganization } as never,
      { findByEmail } as never,
      { record } as never,
      { send } as never,
      { runInTransaction } as never,
      { publish } as never,
      'sync',
    );

    const response = await useCase.execute({
      organizationId: 'org-1',
      email: 'invitee@example.com',
      roleCode: 'member',
      actorUserId: 'owner-1',
    });

    expect(response.invitationToken).toEqual(expect.any(String));
    expect(send).toHaveBeenCalledWith({
      type: 'organization_invitation',
      to: 'invitee@example.com',
      organizationName: 'Acme',
      roleCode: 'member',
      invitationToken: response.invitationToken,
      expiresInDays: 7,
    });
    expect(record).toHaveBeenCalled();
  });
});
