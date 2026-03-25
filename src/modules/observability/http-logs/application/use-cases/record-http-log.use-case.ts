import { Inject, Injectable } from '@nestjs/common';
import { HTTP_LOG_REPOSITORY_TOKEN } from '../ports/http-log.repository.token';
import type { HttpLogRepositoryPort } from '../../domain/ports/http-log.repository.port';
import { HttpLog, type CreateHttpLogProps } from '../../domain/entities/http-log.entity';

@Injectable()
export class RecordHttpLogUseCase {
  constructor(
    @Inject(HTTP_LOG_REPOSITORY_TOKEN)
    private readonly httpLogRepository: HttpLogRepositoryPort,
  ) {}

  async execute(command: CreateHttpLogProps): Promise<void> {
    const httpLog = HttpLog.create(command);
    await this.httpLogRepository.save(httpLog);
  }
}
