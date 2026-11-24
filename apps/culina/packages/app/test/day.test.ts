// The calendar day of an instant in a time zone (src/shared/day.ts), the day a dish was cooked is
// kept on. What it does not prove: the zone a real device reports; Node's zone data is used.
import { expect, test } from 'vitest';
import { localDayOf } from '../src/shared/day';

test('the day as the zone sees it, around midnight on both sides of UTC', () => {
  expect(localDayOf('2026-11-24T23:30:00.000Z', 'Europe/Berlin')).toBe('2026-11-25');
  expect(localDayOf('2026-11-25T04:30:00.000Z', 'America/New_York')).toBe('2026-11-24');
  expect(localDayOf('2026-11-24T23:30:00.000Z', 'UTC')).toBe('2026-11-24');
  expect(localDayOf('2026-12-31T23:30:00.000Z', 'Asia/Tokyo')).toBe('2027-01-01');
});

test('an instant that cannot be read gives its first ten characters', () => {
  expect(localDayOf('2026-11-24-nonsense', 'UTC')).toBe('2026-11-24');
});
