// The single state object of the app. Only what the shell needs; screens
// derive everything else. The route is the URL; preferences live in the
// local store (store/), with a copy in prefs.ts for the first paint.

import { ALCOHOL_PRESETS } from '@mixtura/engine';
import { type DestId } from './destinations';
import { parseHash, type Route } from './router';
import { initialSpecView, type SpecView } from './screens/spec/session';
import {
  type Backup,
  type BuyNextMode,
  type ExportFile,
  type ParseFailure,
  type PersistState,
  type Plan,
  type StoreErrorKind,
  type YesNo,
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
      /** Set when the file came from a share link: the preview is the one-drink variant. */
      share?: { name: string | null };
    }
  | { kind: 'error'; failure: ParseFailure }
  /** A share link that could not be opened (share/open.ts). */
  | { kind: 'share-error'; reason: ShareFailure };

/** Why a share link was not opened: the decoding reasons, a payload that is no drink, no storage. */
export type ShareFailure = 'damaged' | 'version' | 'too-large' | 'not-drink' | 'no-storage';

/** The sheet that shares one drink; `note` is what the last Copy Link did. */
export type ShareState =
  | { kind: 'closed' }
  | { kind: 'busy' }
  | { kind: 'ready'; url: string; name: string; note: 'none' | 'copied' | 'failed' }
  | { kind: 'too-long' }
  | { kind: 'failed' };

export interface Toast {
  id: number;
  text: string;
  undo?: () => void;
}

export interface AppState {
  route: Route;
  theme: Theme;
  units: Units;
  /** Threshold presets of the alcohol filters, kept in Settings (ids of the engine's `ALCOHOL_PRESETS`). */
  alcoholWithout: string;
  alcoholLow: string;
  /** Buy Next counts drinks that need a substitute, or only exact ones; the address can override it. */
  buyNextMode: BuyNextMode;
  /** Buy Next ranks drafts and retired drinks (Settings). */
  buyNextDrafts: YesNo;
  buyNextRetired: YesNo;
  /** Single-key shortcuts (`/`, `n`) are on; a device setting kept in this browser only (shortcuts-pref.ts). */
  shortcuts: YesNo;
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
  /** The share sheet of the spec screen (share/actions.ts). */
  share: ShareState;
  toast: Toast | null;
  /** Counts finished loads of the browse model (screens/browse/load.ts); a change redraws. */
  browseRev: number;
  /** Counts rankings that arrived from the ranking worker (stock/rank-async.ts); a change redraws. */
  rankRev: number;
  /** Counts changes the stock screens draw from (stock records loaded or written, tree expanded); a change redraws. */
  stockRev: number;
  /** Counts changes of the editor's structure (a line added, a sheet opened, a draft restored); a change redraws. */
  editorRev: number;
  /** Temporary state of the spec screen (what-if volumes); never stored. */
  specView: SpecView;
  /** Last route of each destination, so switching back restores its stack. */
  lastRoute: Partial<Record<DestId, string>>;
}

export function initialState(hash: string, prefs: Pick<AppState, 'theme' | 'units'>): AppState {
  return {
    route: parseHash(hash),
    ...prefs,
    alcoholWithout: ALCOHOL_PRESETS.default.without,
    alcoholLow: ALCOHOL_PRESETS.default.low,
    buyNextMode: 'with-substitutes',
    buyNextDrafts: 'yes',
    buyNextRetired: 'no',
    shortcuts: 'yes',
    update: 'none',
    storage: { kind: 'opening' },
    seed: { kind: 'loading' },
    persistence: 'unknown',
    saveError: null,
    backup: { changesSinceExport: 0 },
    userRecords: null,
    importBackup: false,
    importFlow: { kind: 'idle' },
    share: { kind: 'closed' },
    toast: null,
    browseRev: 0,
    rankRev: 0,
    stockRev: 0,
    editorRev: 0,
    specView: initialSpecView,
    lastRoute: {},
  };
}
