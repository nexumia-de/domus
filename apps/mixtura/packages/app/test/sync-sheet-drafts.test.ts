// The drafts of the Sync sheets: forgotten when their sheet closes (not while the
// storage sheet is open over bind or join) and when the page is left.
import { beforeEach, expect, test, vi } from 'vitest';
import { drafts, resetAll } from '../src/screens/sync/drafts';
import { leaveSyncPage, sheetShown } from '../src/screens/sync/sheet-drafts';
import { trackLeave } from '../src/shell/leave';
import type { Screen } from '../src/screen';

beforeEach(() => {
  leaveSyncPage();
  resetAll();
});

test('closing the storage sheet forgets its password', () => {
  sheetShown('storage');
  drafts.storage.password = 'hunter2';
  drafts.storage.show = true;
  sheetShown(null);
  expect(drafts.storage.password).toBe('');
  expect(drafts.storage.show).toBe(false);
});

test('closing bind or join forgets their passphrase', () => {
  sheetShown('bind');
  drafts.bind.passphrase = 'one two three';
  sheetShown(null);
  expect(drafts.bind.passphrase).toBe('');
  sheetShown('join');
  drafts.join.passphrase = 'secret';
  drafts.join.show = true;
  sheetShown('share');
  expect(drafts.join.passphrase).toBe('');
  expect(drafts.join.show).toBe(false);
});

test('bind, then storage, then bind keeps the passphrase; closing bind forgets it', () => {
  sheetShown('bind');
  drafts.bind.passphrase = 'one two three';
  sheetShown('storage');
  drafts.storage.password = 'pw';
  sheetShown('bind');
  expect(drafts.bind.passphrase).toBe('one two three');
  expect(drafts.storage.password).toBe('');
  sheetShown(null);
  expect(drafts.bind.passphrase).toBe('');
});

test('a bind draft left under the storage sheet is forgotten when that closes to nothing', () => {
  sheetShown('join');
  drafts.join.passphrase = 'secret';
  sheetShown('storage');
  expect(drafts.join.passphrase).toBe('secret');
  sheetShown(null);
  expect(drafts.join.passphrase).toBe('');
});

test('leaving the page forgets everything', () => {
  sheetShown('bind');
  drafts.bind.passphrase = 'one two three';
  sheetShown('storage');
  drafts.storage.password = 'pw';
  drafts.move.problem = 'x';
  drafts.page = 'y';
  leaveSyncPage();
  expect(drafts.bind.passphrase).toBe('');
  expect(drafts.storage.password).toBe('');
  expect(drafts.move.problem).toBeNull();
  expect(drafts.page).toBeNull();
  sheetShown('bind');
  expect(drafts.bind.passphrase).toBe('');
});

test('the shell tells a screen once when the route moves to another screen', () => {
  const leave = vi.fn();
  const a = { id: 'a', leave } as unknown as Screen;
  const b = { id: 'b' } as unknown as Screen;
  trackLeave(a);
  trackLeave(a);
  expect(leave).not.toHaveBeenCalled();
  trackLeave(b);
  trackLeave(null);
  expect(leave).toHaveBeenCalledTimes(1);
});
