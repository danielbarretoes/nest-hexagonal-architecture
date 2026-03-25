import type { HttpLog } from '../entities/http-log.entity';
import type { Paginated } from '../../../../../shared/domain/primitives/paginated';

export type HttpStatusFamily = '2xx' | '3xx' | '4xx' | '5xx';

export interface FindHttpLogsFilters {
  createdFrom?: Date;
  createdTo?: Date;
  statusFamily?: HttpStatusFamily;
}

export interface HttpLogRepositoryPort {
  save(log: HttpLog): Promise<void>;
  findById(id: string): Promise<HttpLog | null>;
  findByTraceId(traceId: string): Promise<HttpLog[]>;
  findPaginated(
    page: number,
    limit: number,
    filters?: FindHttpLogsFilters,
  ): Promise<Paginated<HttpLog>>;
}
