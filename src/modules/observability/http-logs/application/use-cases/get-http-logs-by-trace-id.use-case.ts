import { Inject, Injectable } from '@nestjs/common';
import { HTTP_LOG_REPOSITORY_TOKEN } from '../ports/http-log.repository.token';
import type { HttpLogRepositoryPort } from '../../domain/ports/http-log.repository.port';

@Injectable()
export class GetHttpLogsByTraceIdUseCase {
  constructor(
    @Inject(HTTP_LOG_REPOSITORY_TOKEN)
    private readonly httpLogRepository: HttpLogRepositoryPort,
  ) {}

  async execute(traceId: string) {
    return this.httpLogRepository.findByTraceId(traceId);
  }
}
