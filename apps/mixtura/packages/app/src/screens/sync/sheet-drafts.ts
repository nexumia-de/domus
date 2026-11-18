// When the open sheet of the Sync page changes, the draft of the one that
// closed is forgotten. Bind and join keep theirs while the storage sheet is
// open over them (Add Storage), so the passphrase the user may have copied
// stays the same; they are forgotten when the storage sheet closes to
// anything else.

import { resetCopies } from './copy-row';
import { reset, resetAll } from './drafts';
import type { SyncSheet } from './sheet-address';

type Draft = 'storage' | 'bind' | 'move' | 'join';
const HOLDS_DRAFT: readonly SyncSheet[] = ['storage', 'bind', 'move', 'join'];
const parkable = (sheet: SyncSheet): sheet is 'bind' | 'join' =>
  sheet === 'bind' || sheet === 'join';

let shown: SyncSheet | null = null;
/** The sheets whose draft waits under the storage sheet. */
const parked = new Set<Draft>();

const forget = (sheet: SyncSheet): void => {
  if (HOLDS_DRAFT.includes(sheet)) reset(sheet as Draft);
  else resetCopies();
};

/** Called with the sheet the address names on every draw of the page. */
export function sheetShown(next: SyncSheet | null): void {
  const before = shown;
  if (before === next) return;
  shown = next;
  if (before !== null) {
    if (next === 'storage' && parkable(before)) parked.add(before);
    else forget(before);
  }
  for (const sheet of [...parked]) {
    if (next === sheet) parked.delete(sheet);
    else if (next !== 'storage') {
      parked.delete(sheet);
      forget(sheet);
    }
  }
}

/** The page is left: forget everything. */
export function leaveSyncPage(): void {
  shown = null;
  parked.clear();
  resetAll();
}
