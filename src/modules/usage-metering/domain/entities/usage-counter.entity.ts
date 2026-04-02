export interface CreateUsageCounterProps {
  metricKey: string;
  organizationId: string;
  userId: string;
  apiKeyId: string;
  routeKey: string;
  statusCode: number;
  occurredAt?: Date;
}

interface UsageCounterProps {
  metricKey: string;
  bucketStart: Date;
  organizationId: string;
  userId: string;
  apiKeyId: string;
  routeKey: string;
  statusCode: number;
  count: number;
  lastSeenAt: Date;
}

export interface ApiKeyUsageSummary {
  apiKeyId: string;
  apiKeyName: string | null;
  routeKey: string;
  statusCode: number;
  totalCount: number;
  lastSeenAt: Date;
}

export class UsageCounter {
  public readonly metricKey: string;
  public readonly bucketStart: Date;
  public readonly organizationId: string;
  public readonly userId: string;
  public readonly apiKeyId: string;
  public readonly routeKey: string;
  public readonly statusCode: number;
  public readonly count: number;
  public readonly lastSeenAt: Date;

  private constructor(props: UsageCounterProps) {
    this.metricKey = props.metricKey;
    this.bucketStart = props.bucketStart;
    this.organizationId = props.organizationId;
    this.userId = props.userId;
    this.apiKeyId = props.apiKeyId;
    this.routeKey = props.routeKey;
    this.statusCode = props.statusCode;
    this.count = props.count;
    this.lastSeenAt = props.lastSeenAt;
    Object.freeze(this);
  }

  static create(props: CreateUsageCounterProps): UsageCounter {
    const occurredAt = props.occurredAt ?? new Date();
    const bucketStart = new Date(occurredAt);

    bucketStart.setUTCMinutes(0, 0, 0);

    return new UsageCounter({
      metricKey: props.metricKey,
      bucketStart,
      organizationId: props.organizationId,
      userId: props.userId,
      apiKeyId: props.apiKeyId,
      routeKey: props.routeKey,
      statusCode: props.statusCode,
      count: 1,
      lastSeenAt: occurredAt,
    });
  }

  static rehydrate(props: UsageCounterProps): UsageCounter {
    return new UsageCounter(props);
  }
}
