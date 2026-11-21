// The pure part of the shared frame: which icon the sync status gets. The DOM of the header,
// the sync button and the toast is checked in the apps' browser checks (Chromium only).
import { describe, expect, test } from 'vitest';
import { syncDisplay } from '../src/frame/sync-display';

describe('syncDisplay', () => {
  const at = '2026-11-20T09:00:00.000Z';
  test('each status and the connection', () => {
    expect(syncDisplay(undefined, true)).toBe('local');
    expect(syncDisplay({ kind: 'device-only' }, true)).toBe('local');
    expect(syncDisplay({ kind: 'in-step', at }, true)).toBe('synced');
    expect(syncDisplay({ kind: 'syncing' }, true)).toBe('syncing');
    expect(syncDisplay({ kind: 'never' }, true)).toBe('never');
    expect(syncDisplay({ kind: 'failed', failure: 'other' }, true)).toBe('failed');
  });
  test('offline is not an error: the failure is not shown as one', () => {
    expect(syncDisplay({ kind: 'failed', failure: 'unreachable' }, false)).toBe('offline');
    expect(syncDisplay({ kind: 'never' }, false)).toBe('offline');
    expect(syncDisplay({ kind: 'in-step', at }, false)).toBe('synced');
  });
});
