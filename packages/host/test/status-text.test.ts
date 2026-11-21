// The status line of a space, with plain words of the test's own, so the file's
// rules (which kind says what, offline, the unknown failure, the age) are pinned
// apart from any app's wording.
import { expect, test } from 'vitest';
import { ago, statusText, type StatusWords } from '../src/status-text';

const words: StatusWords = {
  deviceOnly: 'device',
  syncing: 'syncing',
  never: 'never',
  offline: 'offline',
  inStep: (when) => `in step ${when}`,
  failed: (why) => `failed ${why}`,
  justNow: 'now',
  minutes: (n) => `${n} min`,
  hours: (n) => `${n} h`,
  failures: { other: 'other', unreachable: 'unreachable' },
};
const at = '2026-11-20T09:00:00.000Z';

test('the age is just now, minutes, hours, then the date', () => {
  expect(ago(words, at, '2026-11-20T09:00:59Z')).toBe('now');
  expect(ago(words, at, '2026-11-20T09:05:10Z')).toBe('5 min');
  expect(ago(words, at, '2026-11-20T12:00:00Z')).toBe('3 h');
  expect(ago(words, at, '2026-11-22T12:00:00Z')).toBe('2026-11-20');
  expect(ago(words, at, '2026-11-20T08:00:00Z')).toBe('now');
});

test('each kind says its own words, and offline hides a failure', () => {
  const now = '2026-11-20T09:05:10Z';
  expect(statusText(words, undefined, now, true)).toBe('');
  expect(statusText(words, { kind: 'device-only' }, now, true)).toBe('device');
  expect(statusText(words, { kind: 'syncing' }, now, true)).toBe('syncing');
  expect(statusText(words, { kind: 'never' }, now, true)).toBe('never');
  expect(statusText(words, { kind: 'never' }, now, false)).toBe('offline');
  expect(statusText(words, { kind: 'in-step', at }, now, true)).toBe('in step 5 min');
  expect(statusText(words, { kind: 'failed', failure: 'unreachable' }, now, true)).toBe(
    'failed unreachable',
  );
  expect(statusText(words, { kind: 'failed', failure: 'bad' }, now, true)).toBe('failed other');
  expect(statusText(words, { kind: 'failed', failure: 'unreachable' }, now, false)).toBe('offline');
});
