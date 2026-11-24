// Runs every vector in vectors/cooked against the engine (docs/vectors.md): the date a dish was
// cooked, its record, the dates per family and the order "Not cooked for long".
import { describe, expect, test } from 'vitest';
import { byNotCookedForLong, cookedDates, cookedRecord, isCalendarDay } from '../src/index';
import type { CookedRecord } from '../src/index';
import { loadVectors } from './vector-files';

describe('cooked vectors', () => {
  for (const vector of loadVectors('cooked')) {
    test(vector.id, () => {
      const i = vector.inputs;
      switch (i.kind) {
        case 'cooked_record':
          return expect(cookedRecord(i.family as string, i.date as string)).toEqual(
            vector.expected,
          );
        case 'cooked_dates':
          return expect(Object.fromEntries(cookedDates(i.records as CookedRecord[]))).toEqual(
            (vector.expected as { dates: Record<string, string> }).dates,
          );
        case 'cooked_order': {
          const dishes = i.dishes as { name: string; date?: string }[];
          const names = [...dishes]
            .sort((a, b) => byNotCookedForLong(a.date, b.date) || (a.name < b.name ? -1 : 1))
            .map((d) => d.name);
          return expect(names).toEqual((vector.expected as { names: string[] }).names);
        }
        case 'cooked_calendar':
          return expect((i.days as string[]).map(isCalendarDay)).toEqual(
            (vector.expected as { valid: boolean[] }).valid,
          );
        default:
          throw new Error(`${vector.id}: unknown kind ${String(i.kind)}`);
      }
    });
  }
});

describe('the order compares only dates', () => {
  test('two undated dishes and two of the same day compare equal; the caller breaks the tie', () => {
    expect(byNotCookedForLong(undefined, undefined)).toBe(0);
    expect(byNotCookedForLong('2026-11-01', '2026-11-01')).toBe(0);
    expect(byNotCookedForLong('2026-11-01', undefined)).toBeLessThan(0);
    expect(byNotCookedForLong(undefined, '2026-11-01')).toBeGreaterThan(0);
    expect(byNotCookedForLong('2025-12-31', '2026-01-01')).toBeLessThan(0);
  });
});
