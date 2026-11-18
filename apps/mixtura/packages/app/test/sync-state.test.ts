import { expect, test } from 'vitest';
import { nextState, type SyncOutcome } from '../src/sync';
import { instant, PLACE_ID } from './helpers/sync-client';

const merged = {
  place: { id: PLACE_ID, name: 'x', updatedAt: instant(0) },
  rows: [],
  entities: [],
};
const NOW = instant(40);

test('ok: etag and time are taken, an earlier error is cleared', () => {
  const outcome: SyncOutcome = {
    kind: 'ok',
    changedLocal: false,
    wrote: true,
    etag: 'e2',
    ...merged,
  };
  expect(
    nextState({ etag: 'e1', lastSyncAt: instant(1), lastError: 'server' }, outcome, NOW),
  ).toEqual({
    etag: 'e2',
    lastSyncAt: NOW,
  });
});

test('ok without a file keeps the earlier etag', () => {
  const outcome: SyncOutcome = { kind: 'ok', changedLocal: false, wrote: false, ...merged };
  expect(nextState({ etag: 'e1' }, outcome, NOW).etag).toBe('e1');
});

test('failed: etag and last success stay, the reason is recorded with its code', () => {
  const previous = { etag: 'e1', lastSyncAt: instant(1) };
  expect(nextState(previous, { kind: 'failed', reason: 'unreachable' }, NOW)).toEqual({
    ...previous,
    lastError: 'unreachable',
  });
  expect(
    nextState(previous, { kind: 'failed', reason: 'unsupported-file', code: 'newer-version' }, NOW)
      .lastError,
  ).toBe('unsupported-file:newer-version');
});

test('moved: counts as a sync and says moved', () => {
  const outcome: SyncOutcome = {
    kind: 'moved',
    moved: { at: instant(9) },
    changedLocal: true,
    etag: 'e3',
    ...merged,
  };
  expect(nextState({ lastError: 'server' }, outcome, NOW)).toEqual({
    etag: 'e3',
    lastSyncAt: NOW,
    lastError: 'moved',
  });
});
