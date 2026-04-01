export class HttpLogWriteDrain {
  private static readonly pendingWrites = new Set<Promise<void>>();

  static track(pendingWrite: Promise<void>): void {
    this.pendingWrites.add(pendingWrite);
  }

  static resolve(pendingWrite: Promise<void>): void {
    this.pendingWrites.delete(pendingWrite);
  }

  static async waitForIdle(): Promise<void> {
    await Promise.all([...this.pendingWrites]);
  }
}
