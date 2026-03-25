/**
 * Current User Decorator
 * Extracts user data from the authenticated request.
 */

import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedHttpRequest, AuthenticatedUserPayload } from '../authenticated-request';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedHttpRequest>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data as keyof AuthenticatedUserPayload] : user;
  },
);
