// The backup state in the `backup` setting: counts committed entity changes,
// remembers the last export and a dismissed reminder. The clock is passed in
// so tests stay deterministic. Updates run one after another, so two quick
// writes never lose a count. Docs: docs/export-format.md#backup-reminder.

import { keyValueRepo, parseBackup } from './repo-settings';
import type { Backup } from './types';

export type Clock = () => string;

export const systemClock: Clock = () => new Date().toISOString();

export interface BackupTracker {
  load(): Promise<Backup>;
  /** One more entity write or delete was committed. */
  recordChange(): Promise<void>;
  /** `count` records were changed at once (an import or its undo). */
  recordChanges(count: number): Promise<void>;
  /** A file was exported: the count restarts. */
  markExported(at: string): Promise<void>;
  /** The reminder was dismissed. */
  dismiss(): Promise<void>;
}

export function createBackupTracker(
  db: IDBDatabase,
  clock: Clock,
  onChange?: (backup: Backup) => void,
): BackupTracker {
  const kv = keyValueRepo<unknown>(db, 'settings');
  let chain: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<Backup> => parseBackup(await kv.get('backup'));
  // Waits for pending counts, so a read right after a write sees it.
  const load = async (): Promise<Backup> => {
    await chain;
    return read();
  };
  const update = (change: (current: Backup) => Backup): Promise<void> => {
    const step = chain.then(async () => {
      const next = change(await read());
      await kv.set('backup', next);
      onChange?.(next);
    });
    // A failed bookkeeping write must not stop the next one, and never fails a data write.
    chain = step.catch(() => undefined);
    return step.catch(() => undefined);
  };
  const add = (current: Backup, count: number): Backup => ({
    ...current,
    changesSinceExport: current.changesSinceExport + count,
    firstChangeAt: current.firstChangeAt ?? clock(),
  });
  return {
    load,
    recordChange: () => update((b) => add(b, 1)),
    recordChanges: (count) => (count > 0 ? update((b) => add(b, count)) : Promise.resolve()),
    markExported: (at) => update(() => ({ lastExportAt: at, changesSinceExport: 0 })),
    dismiss: () => update((b) => ({ ...b, dismissedAt: clock() })),
  };
}
