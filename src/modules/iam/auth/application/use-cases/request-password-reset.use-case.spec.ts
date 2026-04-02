import { User } from '../../../users/domain/entities/user.entity';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case';

describe('RequestPasswordResetUseCase', () => {
  const findByEmail = jest.fn();
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
    findByEmail.mockResolvedValue(user);
    findActiveByUserIdAndPurpose.mockResolvedValue(null);
    hash.mockResolvedValue('hashed-token');
    create.mockResolvedValue(undefined);
    send.mockResolvedValue(undefined);
    runInTransaction.mockImplementation(async (operation: () => Promise<unknown>) => operation());
  });

  it('creates a reset token and sends a password reset email', async () => {
    const useCase = new RequestPasswordResetUseCase(
      { findByEmail } as never,
      {
        findActiveByUserIdAndPurpose,
        create,
        update,
      } as never,
      { hash } as never,
      { send } as never,
      { runInTransaction } as never,
      'sync',
    );

    const response = await useCase.execute(user.email);

    expect(response.resetToken).toEqual(expect.any(String));
    expect(create).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      type: 'password_reset',
      to: user.email,
      recipientName: user.fullName,
      resetToken: response.resetToken,
      expiresInMinutes: 15,
    });
  });
});
