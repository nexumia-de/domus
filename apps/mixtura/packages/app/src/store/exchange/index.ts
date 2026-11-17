// Export and import on top of the stores: the one API the app uses.
// Docs: docs/export-format.md.

import { StoreError } from '../errors';
import type { BackupTracker, Clock } from '../backup';
import { buildExport, total, type ExportFile, type Snapshot } from './format';
import { planImport, type ImportMode, type Plan } from './merge';
import {
  applyInTransaction,
  deleteImportBackup,
  readImportBackup,
  readSnapshot,
  type ImportBackup,
} from './snapshot';

export * from './format';
export * from './merge';
export * from './migrate';
export * from './parse';
export * from './reminder';
export { readSnapshot } from './snapshot';

export interface Exchange {
  /** The export object for everything the user entered. */
  exportData(meta: { exportedAt: string; seedVersion?: string | undefined }): Promise<ExportFile>;
  /** What an import would do; reads only. */
  plan(file: ExportFile, mode: ImportMode): Promise<Plan>;
  /** Applies a file in one transaction and keeps the previous data for undo. */
  importData(file: ExportFile, mode: ImportMode): Promise<Plan>;
  /** Puts the data back as it was before the last import. */
  undoImport(): Promise<Plan>;
  importBackup(): Promise<ImportBackup | undefined>;
  discardImportBackup(): Promise<void>;
}

const changed = (plan: Plan): number =>
  total(plan.added) + total(plan.replaced) + total(plan.removed);

export function createExchange(db: IDBDatabase, tracker: BackupTracker, clock: Clock): Exchange {
  return {
    async exportData(meta) {
      return buildExport(await readSnapshot(db), meta);
    },
    async plan(file, mode) {
      return planImport(await readSnapshot(db), file, mode);
    },
    async importData(file, mode) {
      const { plan } = await applyInTransaction(
        db,
        (before: Snapshot) => planImport(before, file, mode),
        { takenAt: clock() },
      );
      await tracker.recordChanges(changed(plan));
      return plan;
    },
    async undoImport() {
      const backup = await readImportBackup(db);
      if (!backup) throw new StoreError('failed', 'There is no import to undo');
      const { plan } = await applyInTransaction(
        db,
        (before: Snapshot) => planImport(before, backup.snapshot, 'replace'),
        null,
      );
      await tracker.recordChanges(changed(plan));
      return plan;
    },
    importBackup: () => readImportBackup(db),
    discardImportBackup: () => deleteImportBackup(db),
  };
}
