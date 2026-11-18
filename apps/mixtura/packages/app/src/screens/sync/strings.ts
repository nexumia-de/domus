// Fixed texts of the Sync page and its sheets (docs/ui-strings.md#sync).
// Titles and buttons in header capitalisation, descriptions in sentence
// capitalisation. The address of the setup document is kept here only.

import type { ConnectionState } from '../../sync/webdav-connection';
import type { SyncProblem } from '../../sync/status';
import type { JoinProblem } from '../../sync/join';
import type { RelocateProblem } from '../../sync/relocate';

/** The setup document a user follows to make a storage usable from a browser. */
export const SETUP_URL = 'https://github.com/nexumia-de/mixtura/blob/main/docs/sync-backends.md';

/** `minutes` since a sync, as words; a date after a day. */
export function ago(at: string, now: string): string {
  const minutes = Math.floor((Date.parse(now) - Date.parse(at)) / 60_000);
  if (!(minutes >= 1)) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  return at.slice(0, 10);
}

/** The problems that name a cause; the setup link is offered for the ones a server setting fixes. */
export const problemTexts: Record<SyncProblem, string> = {
  'wrong-passphrase': 'Wrong passphrase, or the file was changed',
  unauthorised: 'The storage refused the sign-in',
  unreachable: 'Storage not reachable',
  blocked:
    'The storage did not answer in a way a browser may read, usually because it does not allow requests from this app (CORS)',
  'etag-not-exposed':
    'The storage hides its ETag header from this app, so changes cannot be written safely',
  'not-found': 'The folder could not be found or made',
  server: 'The storage answered with an error',
  moved: 'This place moved to other storage',
  'newer-version': 'The file is from a newer version of the app. Update the app',
  'unsupported-file': 'The file is not one this app can read',
  'other-place': 'The file belongs to another place',
  'gave-up': 'Gave up after several tries. Sync Now tries again',
  internal: 'Something went wrong while syncing',
};

export const needsSetupLink = (problem: SyncProblem | JoinProblem): boolean =>
  problem === 'blocked' || problem === 'etag-not-exposed';

const joinTexts: Record<Exclude<JoinProblem, SyncProblem>, string> = {
  'invalid-code': 'The place code is not valid. Copy it again from the Share sheet of the place.',
  'invalid-folder': 'The folder cannot contain "." or ".." parts.',
  'no-storage': 'Choose a storage first.',
  'empty-passphrase': 'Enter the passphrase.',
  'missing-file':
    'There is no file for this place code in that folder. Check the folder and the place code.',
};

/** What a refused join says; nothing was joined. */
export function joinText(problem: JoinProblem): string {
  if (problem === 'wrong-passphrase')
    return 'Wrong passphrase, or the file was changed. Nothing was joined.';
  if (problem === 'moved') return 'This place moved to other storage. Ask for the new values.';
  return problem in joinTexts
    ? joinTexts[problem as keyof typeof joinTexts]
    : problemTexts[problem as SyncProblem];
}

/** What a refused move says; nothing changed. */
export function moveText(problem: RelocateProblem): string {
  switch (problem) {
    case 'same-place':
      return 'Choose another storage or another folder.';
    case 'invalid-folder':
      return joinTexts['invalid-folder'];
    case 'no-storage':
      return joinTexts['no-storage'];
    case 'unbound':
      return 'This place is not synced.';
    default:
      return `${problemTexts[problem]}. Nothing was moved.`;
  }
}

export const connectionTexts: Record<ConnectionState, string> = {
  reachable: 'Connected. The storage answered and this app can read the answer.',
  unauthorised: 'The storage refused the user name or password. Check both and try again.',
  blocked: `${problemTexts.blocked}. Check the address too.`,
  unreachable: 'No connection. This device is offline; try again when it is online.',
  server: 'The storage answered with an error. Check the address and that the folder exists.',
};

export const etagNotExposedText =
  'The storage answered, but the browser may not read its ETag header, which sync needs to avoid overwriting changes. The server has to send Access-Control-Expose-Headers: ETag.';

export const syncStrings = {
  intro:
    'Keep the stock of a place in step on your devices, or share it with another person. Each place has one encrypted file in a storage you choose. Nothing leaves this device until you add a storage and sync a place.',
  setupLink: 'Setup guide',
  close: 'Close',
  loading: 'Loading',
  readOnly: 'Sync cannot be changed while your data cannot be saved.',
  storages: {
    title: 'Storages',
    listLabel: 'Storages',
    empty:
      'No storage yet. A storage is a WebDAV folder, for example on Nextcloud or on a server of your own.',
    add: 'Add Storage',
    remove: 'Remove',
    removeAria: (label: string) => `Remove ${label}`,
    removed: (label: string) => `Removed storage ${label}`,
    inUse: (label: string, names: string[]) =>
      `${label} is used by ${names.join(', ')}. Stop syncing ${names.length === 1 ? 'that place' : 'those places'} or move ${names.length === 1 ? 'it' : 'them'} first.`,
    userLine: (user: string) => `User ${user}`,
  },
  form: {
    title: 'Add Storage',
    intro:
      'The address, user name and password stay on this device. They are never exported or synced.',
    label: 'Name',
    labelHint: 'Anything that helps you tell storages apart',
    address: 'Address',
    addressHint:
      'The WebDAV address of a folder that exists. On Nextcloud it ends in /remote.php/dav/files/ and your user name.',
    user: 'User name',
    password: 'Password',
    show: 'Show',
    hide: 'Hide',
    showAria: 'Show password',
    hideAria: 'Hide password',
    test: 'Test Connection',
    testing: 'Testing…',
    save: 'Add Storage',
    emptyLabel: 'Enter a name for the storage.',
    emptyAddress: 'Enter the address of the storage.',
    badAddress: 'The address has to start with https:// or http:// and have no spaces.',
  },
  places: {
    title: 'Places',
    listLabel: 'Places',
    empty: 'No place yet.',
    syncAll: 'Sync All',
    join: 'Join a Place…',
    statuses: {
      local: 'On this device only',
      pending: 'Changes waiting',
      syncing: 'Syncing…',
      waiting: 'Waiting for connection',
      synced: (at: string, now: string) => `In sync · ${ago(at, now)}`,
    },
    syncThis: 'Sync This Place…',
    syncNow: 'Sync Now',
    share: 'Share…',
    move: 'Move…',
    stop: 'Stop Syncing',
    passphrase: 'Show Passphrase',
    joinAgain: 'Join Again…',
    syncThisAria: (name: string) => `Sync This Place, ${name}`,
    syncNowAria: (name: string) => `Sync Now, ${name}`,
    shareAria: (name: string) => `Share ${name}`,
    moveAria: (name: string) => `Move ${name}`,
    stopAria: (name: string) => `Stop Syncing, ${name}`,
    passphraseAria: (name: string) => `Show Passphrase, ${name}`,
    joinAgainAria: (name: string) => `Join Again, ${name}`,
    stopped: (name: string) =>
      `Stopped syncing ${name}. Its stock on this device and the file in the storage stay`,
    storageLine: (storage: string, folder: string) => `${storage} · ${folder}`,
  },
  bind: {
    title: (name: string) => `Sync ${name}`,
    intro:
      'The stock of this place is kept in an encrypted file in the storage you choose. Whoever has the passphrase and access to the folder can read and change it.',
    storage: 'Storage',
    folder: 'Folder',
    folderHint: (id: string) => `The file is <folder>/${id}.json`,
    passphrase: 'Passphrase',
    passphraseHint:
      'Write it down. It is kept on this device, and without it nobody can open the file again, not even you on a new device.',
    noStorage: 'Add a storage first.',
    start: 'Start Syncing',
    starting: 'Starting…',
  },
  share: {
    title: (name: string) => `Share ${name}`,
    intro: 'Another person enters these four values under Sync, Join a Place.',
    address: 'Storage address',
    folder: 'Folder',
    placeCode: 'Place code',
    passphrase: 'Passphrase',
    warning:
      'Whoever has these values and access to the folder can read and change this place’s stock.',
    copy: 'Copy',
    copyAria: (what: string) => `Copy ${what}`,
    copied: 'Copied',
    copyFailed: 'Copying failed. Select the text and copy it by hand.',
  },
  passphrase: {
    title: (name: string) => `Passphrase of ${name}`,
    text: 'Kept on this device. Whoever has it and access to the folder can read and change this place’s stock.',
  },
  move: {
    title: (name: string) => `Move ${name}`,
    intro:
      'The stock goes to the storage and folder you choose, and the old file is marked as moved. Everyone else sees that the place moved and can join it again.',
    start: 'Move Place',
    starting: 'Moving…',
    done: (name: string) => `Moved ${name}`,
    unmarked: (name: string) => `Moved ${name}. The old file could not be marked as moved`,
  },
  join: {
    title: 'Join a Place',
    againTitle: 'Join Again',
    intro:
      'Enter what the person who shares the place sees under Share. The first sync brings the name and the stock; until then the place is called Joined place.',
    againIntro:
      'The place moved. Ask for the new storage address, folder and passphrase, then enter them here. The place code is filled in.',
    storage: 'Storage',
    folder: 'Folder',
    placeCode: 'Place code',
    passphrase: 'Passphrase',
    start: 'Join Place',
    starting: 'Joining…',
    done: 'Joined the place',
  },
} as const;
