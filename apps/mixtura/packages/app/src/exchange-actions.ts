// What the Data screen does, host side: the clock, the file picker's File,
// the download and the toasts live here; the store gets plain values
// (docs/export-format.md). Every action ends in a state change the screen
// draws; nothing is written before the user chose Merge or Replace.

import { type AppState } from './app-state';
import { invalidateStock } from './stock/state';
import { showToast } from './toast';
import { strings } from './strings';
import {
  countsOf,
  KINDS,
  MAX_FILE_BYTES,
  parseExportFile,
  total,
  toStoreError,
  exportFileName,
  type Counts,
  type ImportMode,
  type LocalStore,
  type Plan,
} from './store';
import { type Store } from './state';

export interface ExchangeActions {
  exportAll(): Promise<void>;
  chooseFile(file: File): Promise<void>;
  apply(mode: ImportMode): Promise<void>;
  cancelImport(): void;
  undo(): Promise<void>;
  deleteImportBackup(): Promise<void>;
  dismissReminder(): Promise<void>;
  /** Re-reads the counts and the import backup flag from the store. */
  refresh(): Promise<void>;
}

export interface ExchangeHost {
  app: Store<AppState>;
  local(): LocalStore | null;
  seedVersion(): string;
  now(): Date;
  /** Offers the text as a file to save. */
  download(name: string, text: string): void;
}

export { TOAST_MS } from './toast';

export function formatCounts(counts: Counts): string {
  const parts = KINDS.filter((k) => counts[k] > 0).map((k) => {
    const [one, many] = strings.data.kinds[k];
    return `${counts[k]} ${counts[k] === 1 ? one : many}`;
  });
  return parts.length > 0 ? parts.join(', ') : strings.data.nothingChanged;
}

const sum = (a: Counts, b: Counts): Counts => {
  const out = { ...a };
  for (const k of KINDS) out[k] = a[k] + b[k];
  return out;
};

/** What an applied plan brought in: added plus replaced records. */
export const importedCounts = (plan: Plan): Counts => sum(plan.added, plan.replaced);

/** The browser's download: a Blob behind a temporary link. */
export function saveAsFile(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function createExchangeActions(host: ExchangeHost): ExchangeActions {
  const { app } = host;
  const toast = (text: string, undo?: () => void): void => showToast(app, text, undo);
  const fail = (error: unknown): void => {
    app.set({ importFlow: { kind: 'idle' } });
    toast(`${strings.data.notSaved}. ${toStoreError(error).message}`);
  };

  const refresh = async (): Promise<void> => {
    const local = host.local();
    if (!local) return;
    try {
      const file = await local.exchange.exportData({ exportedAt: host.now().toISOString() });
      app.set({
        userRecords: total(countsOf(file)),
        importBackup: (await local.exchange.importBackup()) !== undefined,
        backup: await local.backup.load(),
      });
    } catch {
      // The screen keeps what it had.
    }
  };

  return {
    refresh,
    async exportAll() {
      const local = host.local();
      if (!local) return;
      try {
        const exportedAt = host.now().toISOString();
        const file = await local.exchange.exportData({
          exportedAt,
          seedVersion: host.seedVersion(),
        });
        host.download(exportFileName(exportedAt), `${JSON.stringify(file, null, 2)}\n`);
        await local.backup.markExported(exportedAt);
        toast(strings.data.exported(formatCounts(countsOf(file))));
        await refresh();
      } catch (error) {
        fail(error);
      }
    },
    async chooseFile(file) {
      const local = host.local();
      if (!local) return;
      app.set({ importFlow: { kind: 'busy' } });
      try {
        // Size is checked before the file is read into memory.
        const text = file.size > MAX_FILE_BYTES ? '' : await file.text();
        const result = parseExportFile(text, file.size);
        if (!result.ok) {
          app.set({ importFlow: { kind: 'error', failure: result.failure } });
          return;
        }
        const own = host.seedVersion();
        app.set({
          importFlow: {
            kind: 'preview',
            file: result.file,
            merge: await local.exchange.plan(result.file, 'merge'),
            replace: await local.exchange.plan(result.file, 'replace'),
            migratedFrom: result.migratedFrom,
            seedMismatch:
              result.file.seedVersion && result.file.seedVersion !== own
                ? { found: result.file.seedVersion, own }
                : null,
          },
        });
      } catch (error) {
        fail(error);
      }
    },
    async apply(mode) {
      const local = host.local();
      const flow = app.get().importFlow;
      if (!local || flow.kind !== 'preview') return;
      app.set({ importFlow: { kind: 'busy' } });
      try {
        const plan = await local.exchange.importData(flow.file, mode);
        invalidateStock(app);
        app.set({ importFlow: { kind: 'idle' } });
        toast(strings.data.imported(formatCounts(importedCounts(plan))), () => void this.undo());
        await refresh();
      } catch (error) {
        fail(error);
      }
    },
    cancelImport: () => app.set({ importFlow: { kind: 'idle' } }),
    async undo() {
      const local = host.local();
      if (!local) return;
      try {
        await local.exchange.undoImport();
        invalidateStock(app);
        toast(strings.data.undone);
        await refresh();
      } catch (error) {
        fail(error);
      }
    },
    async deleteImportBackup() {
      try {
        await host.local()?.exchange.discardImportBackup();
        await refresh();
      } catch (error) {
        fail(error);
      }
    },
    async dismissReminder() {
      await host.local()?.backup.dismiss();
      await refresh();
    },
  };
}
