import { AsyncLocalStorage } from 'async_hooks';
import type { EntityManager } from 'typeorm';

export class TypeormTransactionContext {
  private static readonly storage = new AsyncLocalStorage<EntityManager>();

  static run<T>(manager: EntityManager, callback: () => Promise<T>): Promise<T> {
    return this.storage.run(manager, callback);
  }

  static getManager(): EntityManager | undefined {
    return this.storage.getStore();
  }
}
