import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  const getLiveness = jest.fn();
  const getReadiness = jest.fn();
  const healthService = {
    getLiveness,
    getReadiness,
  } as unknown as HealthService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates liveness checks to the service', () => {
    const controller = new HealthController(healthService);
    getLiveness.mockReturnValue({ status: 'ok' });

    expect(controller.live()).toEqual({ status: 'ok' });
    expect(getLiveness).toHaveBeenCalledTimes(1);
  });

  it('delegates readiness checks to the service', async () => {
    const controller = new HealthController(healthService);
    getReadiness.mockResolvedValue({ status: 'ok', checks: { database: 'up' } });

    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up' },
    });
    expect(getReadiness).toHaveBeenCalledTimes(1);
  });
});
