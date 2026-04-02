import { User } from '../../domain/entities/user.entity';
import { RegisterUserUseCase } from './register-user.use-case';

describe('RegisterUserUseCase', () => {
  const findByEmail = jest.fn();
  const create = jest.fn();
  const hash = jest.fn();
  const send = jest.fn();
  const runInTransaction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    findByEmail.mockResolvedValue(null);
    hash.mockResolvedValue('password-hash');
    create.mockImplementation(async (props: { id: string }) =>
      User.rehydrate({
        id: props.id,
        email: 'john@example.com',
        passwordHash: 'password-hash',
        firstName: 'John',
        lastName: 'Doe',
        emailVerifiedAt: null,
        deletedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );
    send.mockRejectedValue(new Error('SES unavailable'));
    runInTransaction.mockImplementation(async (operation: () => Promise<unknown>) => operation());
  });

  it('keeps self-registration successful even when welcome email delivery fails', async () => {
    const useCase = new RegisterUserUseCase(
      {
        findByEmail,
        create,
      } as never,
      { hash } as never,
      { send } as never,
      { runInTransaction } as never,
      'sync',
    );

    const user = await useCase.execute({
      email: 'john@example.com',
      password: 'Password123',
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(user.email).toBe('john@example.com');
    expect(send).toHaveBeenCalledWith({
      type: 'welcome',
      to: 'john@example.com',
      recipientName: 'John Doe',
    });
  });
});
