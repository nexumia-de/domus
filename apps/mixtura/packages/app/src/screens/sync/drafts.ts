// What the user typed into the sheets of the Sync page, in memory only: the
// fields survive a redraw. A sheet starts empty when a button opens it and is
// forgotten when it closes, everything when the page is left
// (sheet-drafts.ts). Passwords and passphrases live here and in the stores,
// nowhere else.

import type { ConnectionState } from '../../sync/webdav-connection';
import { DEFAULT_FOLDER } from '../../sync/location';
import { resetCopies } from './copy-row';
import { resetInvite } from './invite-block';

export interface Drafts {
  storage: {
    label: string;
    address: string;
    username: string;
    password: string;
    show: boolean;
    testing: boolean;
    test: { state: ConnectionState; detail?: string | undefined } | null;
    problem: string | null;
  };
  bind: {
    storageId: string;
    folder: string;
    passphrase: string;
    busy: boolean;
    problem: string | null;
  };
  move: { storageId: string; folder: string; busy: boolean; problem: string | null };
  join: {
    storageId: string;
    folder: string;
    code: string;
    passphrase: string;
    /** The storage address an invite names ('' without an invite); the storage is chosen for it. */
    address: string;
    /** The user chose a storage in the sheet, so the invite's address no longer chooses. */
    picked: boolean;
    show: boolean;
    busy: boolean;
    problem: string | null;
  };
  /** The refusal of the last action on the page itself (removing a storage). */
  page: string | null;
}

const fresh = (): Drafts => ({
  storage: {
    label: '',
    address: '',
    username: '',
    password: '',
    show: false,
    testing: false,
    test: null,
    problem: null,
  },
  bind: { storageId: '', folder: DEFAULT_FOLDER, passphrase: '', busy: false, problem: null },
  move: { storageId: '', folder: DEFAULT_FOLDER, busy: false, problem: null },
  join: {
    storageId: '',
    folder: DEFAULT_FOLDER,
    code: '',
    passphrase: '',
    address: '',
    picked: false,
    show: false,
    busy: false,
    problem: null,
  },
  page: null,
});

export const drafts: Drafts = fresh();

/** Forgets what a sheet held; called when it opens, so a new one starts empty. */
export function reset(sheet: 'storage' | 'bind' | 'move' | 'join'): void {
  const empty = fresh();
  Object.assign(drafts[sheet], empty[sheet]);
  resetCopies();
  resetInvite();
}

/** Forgets everything (leaving the page). */
export function resetAll(): void {
  const empty = fresh();
  Object.assign(drafts.storage, empty.storage);
  Object.assign(drafts.bind, empty.bind);
  Object.assign(drafts.move, empty.move);
  Object.assign(drafts.join, empty.join);
  drafts.page = null;
  resetCopies();
  resetInvite();
}
