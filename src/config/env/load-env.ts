import { config as loadDotenv } from 'dotenv';

type RuntimeEnvironment = 'development' | 'test' | 'production';

function resolveRuntimeEnvironment(explicitEnvironment?: RuntimeEnvironment): RuntimeEnvironment {
  const runtimeEnvironment = explicitEnvironment ?? process.env.NODE_ENV;

  if (runtimeEnvironment === 'production' || runtimeEnvironment === 'test') {
    return runtimeEnvironment;
  }

  return 'development';
}

export function loadEnvironment(explicitEnvironment?: RuntimeEnvironment): RuntimeEnvironment {
  const runtimeEnvironment = resolveRuntimeEnvironment(explicitEnvironment);

  process.env.NODE_ENV = runtimeEnvironment;

  loadDotenv({
    path: '.env',
    override: false,
  });

  if (runtimeEnvironment === 'test') {
    loadDotenv({
      path: '.env.test',
      override: true,
    });
  }

  return runtimeEnvironment;
}
