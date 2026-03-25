import type { Request } from 'express';
import type { AuthenticatedUserPayload } from './authenticated-request';

export interface HttpLogErrorContext {
  message: string;
  stack: string | null;
}

export interface HttpLogRequest extends Request {
  user?: AuthenticatedUserPayload;
  effectiveOrganizationId?: string;
  httpLogError?: HttpLogErrorContext;
}
