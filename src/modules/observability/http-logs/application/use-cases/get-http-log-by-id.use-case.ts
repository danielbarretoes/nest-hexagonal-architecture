import { Inject, Injectable } from '@nestjs/common';
import { HTTP_LOG_REPOSITORY_TOKEN } from '../ports/http-log.repository.token';
import type { HttpLogRepositoryPort } from '../../domain/ports/http-log.repository.port';

@Injectable()
export class GetHttpLogByIdUseCase {
  constructor(
    @Inject(HTTP_LOG_REPOSITORY_TOKEN)
    private readonly httpLogRepository: HttpLogRepositoryPort,
  ) {}

  async execute(id: string) {
    return this.httpLogRepository.findById(id);
  }
}
