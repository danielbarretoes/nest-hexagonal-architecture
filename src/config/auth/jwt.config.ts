/**
 * JWT Configuration
 */

import type { StringValue } from 'ms';
import { getAppConfig } from '../env/app-config';

export interface JwtConfig {
  secret: string;
  expiresIn: StringValue | number;
}

export function getJwtConfig(): JwtConfig {
  const { auth } = getAppConfig();

  return {
    secret: auth.jwtSecret,
    expiresIn: auth.jwtExpiresIn,
  };
}
