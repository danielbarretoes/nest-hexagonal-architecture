import type { Request } from 'express';

export interface AuthenticatedUserPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedHttpRequest extends Request {
  user?: AuthenticatedUserPayload;
}
