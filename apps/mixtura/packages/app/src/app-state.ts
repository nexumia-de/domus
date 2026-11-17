// The single state object of the app. Only what the shell needs; screens
// derive everything else. The route is the URL; preferences live in the
// local store (store/), with a copy in prefs.ts for the first paint.

import { type DestId } from './destinations';
import { parseHash, type Route } from './router';
import { initialSpecView, type SpecView } from './screens/spec/session';
import {
  type Backup,
  type ExportFile,
  type ParseFailure,
  type PersistState,
  type Plan,
  type StoreErrorKind,
} from './store';

export type Theme = 'system' | 'light' | 'dark';
export type Units = 'metric' | 'us' | 'imperial';

/** The local store: opening, usable, or failed (the app is then read-only). */
export type StorageStatus =
  | { kind: 'opening' }
  | { kind: 'ready' }
  | { kind: 'error'; error: StoreErrorKind; reason: string };

/** The import dialog-less flow on the Data screen. */
export type ImportFlow =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | {
      kind: 'preview';
      file: ExportFile;
      merge: Plan;
      replace: Plan;
      migratedFrom: number | null;
      /** The seed version of the file when it differs from this app's. */
      seedMismatch: { found: string; own: string } | null;
    }
  | { kind: 'error'; failure: ParseFailure };

export interface Toast {
  id: number;
  text: string;
  undo?: () => void;
}

export interface AppState {
  route: Route;
  theme: Theme;
  units: Units;
  /** A new service worker is waiting; the banner offers the update. */
  update: 'none' | 'available';
  storage: StorageStatus;
  /** The built-in data: loading, loaded, or failed with the reason. */
  seed: { kind: 'loading' | 'ready' } | { kind: 'failed'; reason: string };
  /** Answer to the persistent-storage request, shown in Settings. */
  persistence: PersistState | 'unknown';
  /** Reason the last settings change could not be saved, else null. */
  saveError: string | null;
  /** Backup reminder state, from the store. */
  backup: Backup;
  /** Records the user entered (what an export would hold); null until known. */
  userRecords: number | null;
  /** A copy of the data from before the last import exists. */
  importBackup: boolean;
  importFlow: ImportFlow;
  toast: Toast | null;
  /** Counts finished loads of the browse model (screens/browse/load.ts); a change redraws. */
  browseRev: number;
  /** Temporary state of the spec screen (what-if volumes); never stored. */
  specView: SpecView;
  /** Last route of each destination, so switching back restores its stack. */
  lastRoute: Partial<Record<DestId, string>>;
}

export function initialState(hash: string, prefs: Pick<AppState, 'theme' | 'units'>): AppState {
  return {
    route: parseHash(hash),
    ...prefs,
    update: 'none',
    storage: { kind: 'opening' },
    seed: { kind: 'loading' },
    persistence: 'unknown',
    saveError: null,
    backup: { changesSinceExport: 0 },
    userRecords: null,
    importBackup: false,
    importFlow: { kind: 'idle' },
    toast: null,
    browseRev: 0,
    specView: initialSpecView,
    lastRoute: {},
  };
}
