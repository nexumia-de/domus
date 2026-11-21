// The words Mixtura gives the shared sync status text (the Spaces sheet and the header icon).
import { expect, test } from 'vitest';
import { statusText } from '@nexumia-de/hospes';
import { strings } from '../src/strings';

const syncText = (...args: Parameters<typeof statusText> extends [unknown, ...infer R] ? R : never) =>
  statusText(strings.spaces.status, ...args);

test('the status in words', () => {
  const at = '2026-11-20T09:00:00.000Z';
  const later = '2026-11-20T09:05:10.000Z';
  expect(syncText({ kind: 'device-only' }, later, true)).toBe('On this device only');
  expect(syncText({ kind: 'in-step', at }, later, true)).toBe('In step · 5 min ago');
  expect(syncText({ kind: 'in-step', at }, at, true)).toBe('In step · just now');
  expect(syncText({ kind: 'never' }, later, true)).toBe('Not synced yet');
  expect(syncText({ kind: 'never' }, later, false)).toBe('Offline');
  expect(syncText({ kind: 'failed', failure: 'unauthorised' }, later, true)).toBe(
    'Last sync failed: the storage refused the access',
  );
  expect(syncText({ kind: 'failed', failure: 'bad-document' }, later, true)).toBe(
    'Last sync failed: the file in the storage could not be read',
  );
  expect(syncText(undefined, later, true)).toBe('');
});
