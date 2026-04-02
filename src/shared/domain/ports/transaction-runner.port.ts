export interface TransactionRunnerPort {
  runInTransaction<T>(operation: () => Promise<T>): Promise<T>;
}
