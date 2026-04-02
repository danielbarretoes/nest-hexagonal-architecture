export interface CreateJobExecutionReceiptProps {
  jobId: string;
  handler: string;
}

interface JobExecutionReceiptProps extends CreateJobExecutionReceiptProps {
  createdAt: Date;
}

export class JobExecutionReceipt {
  public readonly jobId: string;
  public readonly handler: string;
  public readonly createdAt: Date;

  private constructor(props: JobExecutionReceiptProps) {
    this.jobId = props.jobId;
    this.handler = props.handler;
    this.createdAt = props.createdAt;
    Object.freeze(this);
  }

  static create(props: CreateJobExecutionReceiptProps): JobExecutionReceipt {
    return new JobExecutionReceipt({
      ...props,
      createdAt: new Date(),
    });
  }

  static rehydrate(props: JobExecutionReceiptProps): JobExecutionReceipt {
    return new JobExecutionReceipt(props);
  }
}
