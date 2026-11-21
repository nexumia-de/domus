// "Erase everything on this device": what goes (counted for the confirmation) and the erase itself.
// It empties Culina's own database (every record and version, the skill state, drafts, the old
// stock items still waiting for their move) and removes this app's preferences from localStorage
// (every key that starts with `culina.`). The stock of a space is not touched: it lives in the
// database all apps share, and erasing the local copy of a synced space is not safe today
// (docs/behaviour.md, Erase everything on this device).
import { EXPORT_KINDS, type ExportKind } from '@culina/engine';
import { state } from '../notebook/state';
import { fail, type Result } from '../store/types';

/** What localStorage offers for listing and removing keys. */
export interface ErasablePrefs {
  readonly length: number;
  key(index: number): string | null;
  removeItem(key: string): void;
}

/** The prefix of every key this app keeps in localStorage. */
export const PREFS_PREFIX = 'culina.';

export interface EraseCounts {
  /** Live records per kind of the export file (skills included). */
  records: Record<ExportKind, number>;
  /** Unsaved forms. */
  drafts: number;
  /** Preferences of this app kept on this device. */
  prefs: number;
}

const browserPrefs = (): ErasablePrefs | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** The keys of this app, read before any is removed (removing shifts the indexes). */
const ownKeys = (prefs: ErasablePrefs | null): string[] => {
  const keys: string[] = [];
  try {
    if (prefs === null) return keys;
    for (let i = 0; i < prefs.length; i++) {
      const key = prefs.key(i);
      if (key !== null && key.startsWith(PREFS_PREFIX)) keys.push(key);
    }
  } catch {
    // Storage that throws keeps nothing this app could list.
  }
  return keys;
};

/** Counts what an erase would remove, for the confirmation. */
export const eraseCounts = async (
  prefs: ErasablePrefs | null = browserPrefs(),
): Promise<Result<{ counts: EraseCounts }>> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const records = Object.fromEntries(EXPORT_KINDS.map((k) => [k, 0])) as Record<ExportKind, number>;
  for (const kind of EXPORT_KINDS) {
    const listed = await state.store.list(kind);
    if (!listed.ok) return listed;
    records[kind] = listed.records.length;
  }
  const drafts = await state.store.drafts.list();
  if (!drafts.ok) return drafts;
  return {
    ok: true,
    counts: { records, drafts: drafts.drafts.length, prefs: ownKeys(prefs).length },
  };
};

/**
 * Empties Culina's own database in one transaction, then removes this app's preferences. The
 * caller starts the app again (a reload), so that the screens are as on a first start.
 */
export const eraseEverything = async (
  prefs: ErasablePrefs | null = browserPrefs(),
): Promise<Result> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const done = await state.store.eraseAll();
  if (!done.ok) return done;
  for (const key of ownKeys(prefs)) {
    try {
      prefs?.removeItem(key);
    } catch {
      // A key that cannot be removed stays; the database is empty all the same.
    }
  }
  return { ok: true };
};
