import type { DataSource } from 'typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns liveness metadata', () => {
    const service = new HealthService({ query: jest.fn() } as unknown as DataSource);

    expect(service.getLiveness()).toEqual(
      expect.objectContaining({
        status: 'ok',
        uptimeSeconds: expect.any(Number),
        timestamp: expect.any(String),
      }),
    );
  });

  it('checks database readiness', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as DataSource;
    const service = new HealthService(dataSource);

    await expect(service.getReadiness()).resolves.toEqual({
      status: 'ok',
      checks: {
        database: 'up',
      },
      timestamp: expect.any(String),
    });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });
});
