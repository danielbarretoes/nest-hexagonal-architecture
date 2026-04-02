import { User } from '../../../users/domain/entities/user.entity';
import { RequestEmailVerificationUseCase } from './request-email-verification.use-case';

describe('RequestEmailVerificationUseCase', () => {
  const findById = jest.fn();
  const findActiveByUserIdAndPurpose = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const hash = jest.fn();
  const send = jest.fn();
  const runInTransaction = jest.fn();

  const user = User.create({
    id: 'user-1',
    email: 'john@example.com',
    passwordHash: 'hash',
    firstName: 'John',
    lastName: 'Doe',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findById.mockResolvedValue(user);
    findActiveByUserIdAndPurpose.mockResolvedValue(null);
    hash.mockResolvedValue('hashed-token');
    create.mockResolvedValue(undefined);
    send.mockResolvedValue(undefined);
    runInTransaction.mockImplementation(async (operation: () => Promise<unknown>) => operation());
  });

  it('creates a verification token and sends an email verification message', async () => {
    const useCase = new RequestEmailVerificationUseCase(
      { findById } as never,
      {
        findActiveByUserIdAndPurpose,
        create,
        update,
      } as never,
      { hash } as never,
      { send } as never,
      { runInTransaction } as never,
    );

    const response = await useCase.execute(user.id);

    expect(response.verificationToken).toEqual(expect.any(String));
    expect(send).toHaveBeenCalledWith({
      type: 'email_verification',
      to: user.email,
      recipientName: user.fullName,
      verificationToken: response.verificationToken,
      expiresInHours: 24,
    });
  });
});
