// When the backup banner shows: only with changes no export holds, after the chosen period.
import { describe, expect, test } from 'vitest';
import { reminderDue } from '../src/exchange/reminder';
import {
  readLastExport,
  readReminderDays,
  writeLastExport,
  writeReminderDays,
} from '../src/exchange/backup-prefs';

const DAY = 86_400_000;
const at = (base: string, days: number): string =>
  new Date(Date.parse(base) + days * DAY).toISOString();
const T0 = '2026-10-01T08:00:00.000Z';

describe('reminderDue', () => {
  test('no changes at all: no banner', () => {
    expect(reminderDue({ now: at(T0, 100), span: {}, days: 30 })).toBeUndefined();
  });

  test('never exported: due once the oldest change is a period old, with null days', () => {
    const span = { first: T0, last: at(T0, 2) };
    expect(reminderDue({ now: at(T0, 29), span, days: 30 })).toBeUndefined();
    expect(reminderDue({ now: at(T0, 30), span, days: 30 })).toEqual({ sinceExport: null });
  });

  test('exported and nothing changed since: no banner, however long ago', () => {
    const span = { first: T0, last: at(T0, 2) };
    expect(
      reminderDue({ now: at(T0, 400), lastExport: at(T0, 3), span, days: 30 }),
    ).toBeUndefined();
  });

  test('exported, changed since, period passed: due with the whole days since the export', () => {
    const span = { first: T0, last: at(T0, 5) };
    expect(reminderDue({ now: at(T0, 45.5), lastExport: at(T0, 3), span, days: 30 })).toEqual({
      sinceExport: 42,
    });
    expect(reminderDue({ now: at(T0, 32), lastExport: at(T0, 3), span, days: 30 })).toBeUndefined();
  });

  test('off (0 days) never shows', () => {
    const span = { first: T0, last: at(T0, 5) };
    expect(reminderDue({ now: at(T0, 400), span, days: 0 })).toBeUndefined();
  });
});

describe('what the reminder remembers', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
  };

  test('the last export and the period, with defaults when nothing or nonsense is stored', () => {
    const store = memory();
    expect(readLastExport(store)).toBeUndefined();
    expect(readReminderDays(store)).toBe(30);
    expect(writeLastExport(T0, store)).toBe(true);
    expect(writeReminderDays(14, store)).toBe(true);
    expect(readLastExport(store)).toBe(T0);
    expect(readReminderDays(store)).toBe(14);
    store.setItem('culina.reminderDays', '11');
    store.setItem('culina.lastExport', 'yesterday');
    expect(readReminderDays(store)).toBe(30);
    expect(readLastExport(store)).toBeUndefined();
  });

  test('without storage nothing is kept and nothing throws', () => {
    expect(writeLastExport(T0, null)).toBe(false);
    expect(readLastExport(null)).toBeUndefined();
    expect(readReminderDays(null)).toBe(30);
    const throwing = {
      getItem: (): never => {
        throw new Error('blocked');
      },
      setItem: (): never => {
        throw new Error('blocked');
      },
    };
    expect(writeReminderDays(7, throwing)).toBe(false);
    expect(readReminderDays(throwing)).toBe(30);
  });
});
