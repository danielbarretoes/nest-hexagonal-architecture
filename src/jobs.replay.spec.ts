import { parseReplayCommand } from './jobs.replay';

describe('parseReplayCommand', () => {
  it('parses ids, limit and dry-run flags', () => {
    expect(parseReplayCommand(['--ids', 'job-1,job-2', '--limit', '5', '--dry-run'])).toEqual({
      ids: ['job-1', 'job-2'],
      limit: 5,
      dryRun: true,
    });
  });

  it('throws for an invalid limit', () => {
    expect(() => parseReplayCommand(['--limit', '0'])).toThrow(
      'Expected a positive integer after --limit',
    );
  });
});
