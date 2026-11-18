// Opening a share link: decode, then the same parse and plan as a file
// import in merge mode, and the same preview (components/import-preview.ts).
// A share file brings drinks, templates and ingredients only: places, stock
// and pairings are dropped after reading, so a link can never create or
// change a place (docs/export-format.md#share-link).

import { type AppState, type ShareFailure } from '../app-state';
import { type ExchangeActions } from '../exchange-actions';
import { replace } from '../navigation';
import { type Store } from '../state';
import { parseExportFile, type ExportFile, type LocalStore, type ParseFailure } from '../store';
import { decodePayload } from './link';

/** The address of the screen that shows an opened link; the payload is not part of it. */
export const SHARE_HASH = '#/share';

export interface OpenHost {
  app: Store<AppState>;
  local(): LocalStore | null;
}

/** The leaf of the file: the one spec no other spec is made from and no prepared ingredient uses. */
export function sharedSpec(file: ExportFile): ExportFile['specs'][number] | null {
  const used = new Set<string>();
  for (const spec of file.specs) if (spec.parentId) used.add(spec.parentId);
  for (const item of file.ingredients) if (item.prepared) used.add(item.prepared.specId);
  const leaves = file.specs.filter((s) => !used.has(s.id));
  return leaves.length === 1 ? (leaves[0] ?? null) : null;
}

const parseReason = (failure: ParseFailure): ShareFailure => {
  switch (failure.kind) {
    case 'not-mixtura':
      return 'not-drink';
    case 'newer':
      return 'version';
    case 'too-large':
      return 'too-large';
    default:
      return 'damaged';
  }
};

/** Reads a payload into the preview state, or one named error state; never throws. */
export async function openShare(host: OpenHost, payload: string): Promise<void> {
  const { app } = host;
  const stop = (reason: ShareFailure): void =>
    app.set({ importFlow: { kind: 'share-error', reason } });
  app.set({ importFlow: { kind: 'busy' } });
  try {
    const local = host.local();
    if (!local) return stop('no-storage');
    const decoded = await decodePayload(payload);
    if (!decoded.ok) return stop(decoded.reason);
    const result = parseExportFile(decoded.text, decoded.text.length);
    if (!result.ok) return stop(parseReason(result.failure));
    const file: ExportFile = { ...result.file, places: [], stock: [], affinities: [] };
    const head = sharedSpec(file);
    if (file.specs.length === 0) return stop('not-drink');
    app.set({
      importFlow: {
        kind: 'preview',
        file,
        merge: await local.exchange.plan(file, 'merge'),
        replace: await local.exchange.plan(file, 'replace'),
        migratedFrom: null,
        seedMismatch: null,
        share: { name: head ? String(head.name) : null },
      },
    });
  } catch {
    stop('damaged');
  }
}

/** Adds the drink of the preview with the import's transaction, backup and Undo, then opens it. */
export async function addShared(store: Store<AppState>, exchange: ExchangeActions): Promise<void> {
  const flow = store.get().importFlow;
  if (flow.kind !== 'preview') return;
  const head = sharedSpec(flow.file);
  if (!(await exchange.apply('merge'))) return;
  replace(store, head ? `#/drinks/${encodeURIComponent(head.lineageId)}` : '#/drinks');
}

/** Leaves the preview or the error without adding anything. */
export function closeShared(store: Store<AppState>, exchange: ExchangeActions): void {
  exchange.cancelImport();
  replace(store, '#/drinks');
}
