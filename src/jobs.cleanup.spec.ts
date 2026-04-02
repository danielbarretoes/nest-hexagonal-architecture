import { parseCleanupCommand } from './jobs.cleanup';

describe('parseCleanupCommand', () => {
  it('detects dry-run mode', () => {
    expect(parseCleanupCommand(['--dry-run'])).toEqual({
      dryRun: true,
    });
  });

  it('defaults to a mutating cleanup run', () => {
    expect(parseCleanupCommand([])).toEqual({
      dryRun: false,
    });
  });
});
