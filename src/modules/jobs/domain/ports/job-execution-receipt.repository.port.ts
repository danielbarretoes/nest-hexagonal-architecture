import type { JobExecutionReceipt } from '../entities/job-execution-receipt.entity';

export interface JobExecutionReceiptRepositoryPort {
  findByJobIdAndHandler(jobId: string, handler: string): Promise<JobExecutionReceipt | null>;
  create(receipt: JobExecutionReceipt): Promise<JobExecutionReceipt>;
}
