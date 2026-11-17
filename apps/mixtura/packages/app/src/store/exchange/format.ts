// The export file's shape and its pure builders live in the engine
// (packages/engine/src/exchange/); the store re-exports them so the app has
// one import path (docs/export-format.md#where-the-rules-live).

export {
  buildExport,
  countsOf,
  exportFileName,
  FORMAT_VERSION,
  KINDS,
  MAX_FILE_BYTES,
  totalCount as total,
} from '@mixtura/engine';
export type { Counts, ExportFile, Kind, Snapshot } from '@mixtura/engine';
