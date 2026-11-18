// The state line of a place: derived from the binding, the scheduler's
// bookkeeping and the network (src/sync/status.ts).
import { expect, test } from 'vitest';
import { nextState } from '../src/sync';
import { placeStatus, problemOf, problemOfFailure, type StatusInput } from '../src/sync/status';
import { ago, problemTexts } from '../src/screens/sync/strings';
import { statusText } from '../src/screens/sync/status-text';

const base: StatusInput = {
  bound: true,
  lastSyncAt: '2026-11-18T09:00:00Z',
  running: false,
  pending: false,
  online: true,
};
const status = (patch: Partial<StatusInput>) => placeStatus({ ...base, ...patch });

test('a place without a binding is on this device only, whatever else is true', () => {
  expect(status({ bound: false, running: true, pending: true, online: false })).toEqual({
    kind: 'local',
  });
});

test('a running cycle says syncing, before everything but being unbound', () => {
  expect(status({ running: true, lastError: 'server', pending: true })).toEqual({
    kind: 'syncing',
  });
});

test('in sync carries the time of the last sync', () => {
  expect(status({})).toEqual({ kind: 'synced', at: '2026-11-18T09:00:00Z' });
});

test('a change that waits says so; offline it waits for the connection', () => {
  expect(status({ pending: true })).toEqual({ kind: 'pending' });
  expect(status({ pending: true, online: false })).toEqual({ kind: 'waiting' });
});

test('offline with nothing to send keeps the last state; a never-synced place waits', () => {
  expect(status({ online: false })).toMatchObject({ kind: 'synced' });
  expect(status({ online: false, lastSyncAt: undefined })).toEqual({ kind: 'waiting' });
  expect(status({ lastSyncAt: undefined })).toEqual({ kind: 'pending' });
});

test('the last error is told in words; moved wins over a queued change', () => {
  expect(status({ lastError: 'wrong-passphrase' })).toEqual({
    kind: 'problem',
    problem: 'wrong-passphrase',
  });
  expect(status({ lastError: 'moved', pending: true, online: false })).toEqual({
    kind: 'problem',
    problem: 'moved',
  });
});

test('every stored error maps to a problem with a text', () => {
  const cases: Record<string, string> = {
    'wrong-passphrase': 'wrong-passphrase',
    unauthorised: 'unauthorised',
    unreachable: 'unreachable',
    blocked: 'blocked',
    'blocked:etag-not-exposed': 'etag-not-exposed',
    'not-found': 'not-found',
    server: 'server',
    moved: 'moved',
    'unsupported-file:newer-version': 'newer-version',
    'unsupported-file:unsupported-scheme': 'unsupported-file',
    'other-place': 'other-place',
    'gave-up': 'gave-up',
    internal: 'internal',
    'something else': 'internal',
  };
  for (const [stored, problem] of Object.entries(cases)) {
    expect(problemOf(stored), stored).toBe(problem);
    expect(problemTexts[problemOf(stored)].length).toBeGreaterThan(10);
  }
});

test('a failed cycle and its stored error give the same problem', () => {
  for (const failure of [
    { reason: 'blocked', detail: 'etag-not-exposed' },
    { reason: 'blocked' },
    { reason: 'unsupported-file', code: 'newer-version' },
    { reason: 'wrong-passphrase' },
  ] as const) {
    const outcome = { kind: 'failed' as const, ...failure };
    const stored = nextState({}, outcome, '2026-11-18T10:00:00Z').lastError as string;
    expect(problemOfFailure(outcome)).toBe(problemOf(stored));
  }
});

test('the words of each state', () => {
  const now = '2026-11-18T09:30:00Z';
  expect(statusText({ kind: 'local' }, now)).toBe('On this device only');
  expect(statusText({ kind: 'pending' }, now)).toBe('Changes waiting');
  expect(statusText({ kind: 'syncing' }, now)).toBe('Syncing…');
  expect(statusText({ kind: 'waiting' }, now)).toBe('Waiting for connection');
  expect(statusText({ kind: 'synced', at: '2026-11-18T09:00:00Z' }, now)).toBe(
    'In sync · 30 min ago',
  );
  expect(statusText({ kind: 'problem', problem: 'moved' }, now)).toMatch(/moved/);
});

test('time since the last sync in words', () => {
  const at = '2026-11-18T09:00:00Z';
  expect(ago(at, '2026-11-18T09:00:30Z')).toBe('just now');
  expect(ago(at, '2026-11-18T09:05:00Z')).toBe('5 min ago');
  expect(ago(at, '2026-11-18T12:00:00Z')).toBe('3 h ago');
  expect(ago(at, '2026-11-20T12:00:00Z')).toBe('2026-11-18');
});
