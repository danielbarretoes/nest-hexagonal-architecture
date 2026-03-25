import { Inject, Injectable } from '@nestjs/common';
import { HTTP_LOG_REPOSITORY_TOKEN } from '../ports/http-log.repository.token';
import type {
  FindHttpLogsFilters,
  HttpLogRepositoryPort,
} from '../../domain/ports/http-log.repository.port';

@Injectable()
export class GetPaginatedHttpLogsUseCase {
  constructor(
    @Inject(HTTP_LOG_REPOSITORY_TOKEN)
    private readonly httpLogRepository: HttpLogRepositoryPort,
  ) {}

  async execute(page: number, limit: number, filters?: FindHttpLogsFilters) {
    return this.httpLogRepository.findPaginated(page, limit, filters);
  }
}
