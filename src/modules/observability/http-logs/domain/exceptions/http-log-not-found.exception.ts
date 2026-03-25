import { DomainException } from '../../../../../shared/domain/exceptions';

export class HttpLogNotFoundException extends DomainException {
  constructor(id: string) {
    super('HTTP_LOG_NOT_FOUND', `HTTP log not found: ${id}`);
  }
}
