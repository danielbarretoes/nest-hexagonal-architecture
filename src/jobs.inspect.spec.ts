import { parseInspectCommand } from './jobs.inspect';

describe('parseInspectCommand', () => {
  it('uses the default dead limit when none is provided', () => {
    expect(parseInspectCommand([])).toEqual({
      deadLimit: 10,
    });
  });

  it('parses an explicit dead limit', () => {
    expect(parseInspectCommand(['--dead-limit', '25'])).toEqual({
      deadLimit: 25,
    });
  });

  it('throws for an invalid dead limit', () => {
    expect(() => parseInspectCommand(['--dead-limit', '0'])).toThrow(
      'Expected a positive integer after --dead-limit',
    );
  });
});
