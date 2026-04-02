export interface UsageMetricRecord {
  metricKey: string;
  organizationId: string;
  userId: string;
  apiKeyId?: string | null;
  routeKey: string;
  statusCode: number;
  traceId?: string | null;
  occurredAt?: Date;
}

export interface UsageMeterPort {
  record(command: UsageMetricRecord): Promise<void>;
}
