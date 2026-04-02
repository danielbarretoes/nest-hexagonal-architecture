import { OutboxReplayService } from './outbox-replay.service';
import { JobOutbox } from '../domain/entities/job-outbox.entity';

describe('OutboxReplayService', () => {
  const replayDeadBatch = jest.fn();
  const replayDeadByIds = jest.fn();
  const findByStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('replays an explicit set of dead jobs when ids are provided', async () => {
    replayDeadByIds.mockResolvedValue(['job-1']);

    const service = new OutboxReplayService({
      replayDeadBatch,
      replayDeadByIds,
      findByStatus,
    } as never);

    const result = await service.replayDeadJobs({
      ids: ['job-1', 'job-2'],
      limit: 5,
    });

    expect(replayDeadByIds).toHaveBeenCalledWith(['job-1', 'job-2'], expect.any(Date));
    expect(replayDeadBatch).not.toHaveBeenCalled();
    expect(result).toEqual(['job-1']);
  });

  it('replays the oldest dead jobs by batch when no ids are provided', async () => {
    replayDeadBatch.mockResolvedValue(['job-3', 'job-4']);

    const service = new OutboxReplayService({
      replayDeadBatch,
      replayDeadByIds,
      findByStatus,
    } as never);

    const result = await service.replayDeadJobs({
      limit: 2,
    });

    expect(replayDeadBatch).toHaveBeenCalledWith(2, expect.any(Date));
    expect(replayDeadByIds).not.toHaveBeenCalled();
    expect(result).toEqual(['job-3', 'job-4']);
  });

  it('previews the oldest dead jobs without mutating them', async () => {
    const olderDeadJob = JobOutbox.create({
      id: 'job-9',
      type: 'transactional_email',
      payload: { type: 'welcome', to: 'nine@example.com', recipientName: 'Nine' },
      groupKey: 'transactional_email',
      deduplicationKey: 'dead-9',
    }).markDead('older');
    const latestDeadJob = JobOutbox.create({
      id: 'job-10',
      type: 'transactional_email',
      payload: { type: 'welcome', to: 'ten@example.com', recipientName: 'Ten' },
      groupKey: 'transactional_email',
      deduplicationKey: 'dead-10',
    }).markDead('latest');

    findByStatus.mockResolvedValue([olderDeadJob, latestDeadJob]);

    const service = new OutboxReplayService({
      replayDeadBatch,
      replayDeadByIds,
      findByStatus,
    } as never);

    const result = await service.previewDeadJobs({ limit: 1 });

    expect(findByStatus).toHaveBeenCalledWith('dead');
    expect(result).toEqual(['job-9']);
  });
});
