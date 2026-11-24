// Builds the export file from the store's live records. Time comes in as input.
import { EXPORT_KINDS, type ExportEnvelope, type ExportRecord, type RecordSets } from './types';

/** The version of the file this engine writes and the newest it reads. */
export const EXPORT_FORMAT = 'culina-export';
/**
 * 1: the first file. 2: without `stock`. 3: with `skills`, the techniques marked as learned. 4: with
 * `cooked`, the date each own dish was last cooked (docs/data-model.md#export-file).
 */
export const EXPORT_VERSION = 4;

const byId = (a: ExportRecord, b: ExportRecord): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * The envelope: `format`, `formatVersion`, `exportedAt` and one array per kind that has
 * records, each sorted by id so two exports of the same data are the same text. Drafts and
 * tombstones are not records and never get here.
 *
 * @param records - Live records per kind.
 * @param exportedAt - ISO 8601 UTC instant from the host's clock.
 * @param seedVersion - Optional version of the seed data the ids refer to.
 */
export function buildExport(
  records: RecordSets,
  exportedAt: string,
  seedVersion?: string,
): ExportEnvelope {
  const envelope: ExportEnvelope = {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_VERSION,
    ...(seedVersion === undefined ? {} : { seedVersion }),
    exportedAt,
  };
  for (const kind of EXPORT_KINDS) {
    const list = records[kind] ?? [];
    if (list.length > 0) envelope[kind] = structuredClone([...list].sort(byId)) as ExportRecord[];
  }
  return envelope;
}

/** The file's text: two-space JSON and a final newline. */
export const serializeExport = (envelope: ExportEnvelope): string =>
  `${JSON.stringify(envelope, null, 2)}\n`;

/**
 * A file name without personal data: the app, a date and the extension. The date is the
 * first ten characters of the instant, so the name carries no time of day.
 */
export const exportFileName = (exportedAt: string): string =>
  `cooks-notebook-${exportedAt.slice(0, 10)}.json`;
