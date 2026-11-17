// The preset lookup of data/alcohol-thresholds.json: ids to thresholds, unknown ids to the default.
import { describe, expect, test } from 'vitest';
import { ALCOHOL_PRESETS, ALCOHOL_THRESHOLDS, alcoholThresholds } from '../src/index';

describe('alcoholThresholds', () => {
  test.each([
    ['below-0.5', 'up-to-10', { withoutPct: 0.5, withoutBound: 'below', lowPct: 10 }],
    ['up-to-0.05', 'up-to-1.2', { withoutPct: 0.05, withoutBound: 'upTo', lowPct: 1.2 }],
    ['none', 'up-to-15', { withoutPct: 0, withoutBound: 'upTo', lowPct: 15 }],
    ['nope', undefined, { withoutPct: 0.5, withoutBound: 'below', lowPct: 10 }],
  ])('%s and %s', (without, low, expected) => {
    expect(alcoholThresholds(without, low)).toEqual(expected);
  });

  test('no argument is the default thresholds', () => {
    expect(alcoholThresholds()).toEqual(ALCOHOL_THRESHOLDS);
  });

  test('every preset names its evidence and basis; the 15 % line is an assumption', () => {
    for (const p of [...ALCOHOL_PRESETS.without, ...ALCOHOL_PRESETS.low]) {
      expect(p.evidence.length).toBeGreaterThan(0);
      expect(p.basis.length).toBeGreaterThan(10);
    }
    expect(ALCOHOL_PRESETS.low.find((p) => p.id === 'up-to-15')?.evidence).toBe(
      'assumption, unverified',
    );
  });
});
