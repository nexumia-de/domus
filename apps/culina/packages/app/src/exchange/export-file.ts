// Export: everything the user entered, as one JSON file, built by the engine from the store's
// live records (drafts are not records). The date of the export is remembered on this device.
import { buildExport, exportFileName, serializeExport, EXPORT_KINDS } from '@culina/engine';
import type { RecordSets, ExportRecord } from '@culina/engine';
import { state } from '../notebook/state';
import { fail, type Result } from '../store/types';
import { writeLastExport } from './backup-prefs';
import { downloadText } from './download';

/** The live records of every kind. */
export const liveRecords = async (): Promise<Result<{ records: RecordSets }>> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const records: Record<string, ExportRecord[]> = {};
  for (const kind of EXPORT_KINDS) {
    const listed = await state.store.list(kind);
    if (!listed.ok) return listed;
    records[kind] = listed.records;
  }
  return { ok: true, records };
};

export const exportEverything = async (): Promise<Result<{ fileName: string; count: number }>> => {
  const live = await liveRecords();
  if (!live.ok) return live;
  const count = EXPORT_KINDS.reduce((n, kind) => n + (live.records[kind]?.length ?? 0), 0);
  if (count === 0) return { ok: true, fileName: '', count: 0 };
  const at = state.now();
  const fileName = exportFileName(at);
  downloadText(fileName, serializeExport(buildExport(live.records, at)), 'application/json');
  writeLastExport(at);
  return { ok: true, fileName, count };
};
