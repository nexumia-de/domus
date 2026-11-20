// Building the export object from a snapshot of the user's data. Pure: the
// instant and the versions come from the host (docs/export-format.md).

import {
  APP_TAG,
  FORMAT_VERSION,
  KINDS,
  type Counts,
  type ExportFile,
  type Snapshot,
} from './types';

/** A snapshot with no records. */
export const emptySnapshot = (): Snapshot => ({
  ingredients: [],
  templates: [],
  specs: [],
  affinities: [],
});

/** How many records of each kind a snapshot holds. */
export const countsOf = (snapshot: Snapshot): Counts => ({
  ingredients: snapshot.ingredients.length,
  templates: snapshot.templates.length,
  specs: snapshot.specs.length,
  affinities: snapshot.affinities.length,
});

/** The sum over all kinds of a counts object. */
export const totalCount = (counts: Counts): number => KINDS.reduce((sum, k) => sum + counts[k], 0);

/** Records sorted by key so two exports of the same data are identical. */
function sorted<T>(list: readonly T[], key: (item: T) => string): T[] {
  return [...list].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

/**
 * Builds the export object for a snapshot: records sorted by key so two
 * exports of the same data are identical.
 * @param snapshot Everything the user entered.
 * @param meta The export instant (ISO 8601 UTC) and the seed version, both from the host.
 * @returns The export file object, ready to be written as JSON.
 */
export function buildExport(
  snapshot: Snapshot,
  meta: { exportedAt: string; seedVersion?: string | undefined },
): ExportFile {
  return {
    app: APP_TAG,
    formatVersion: FORMAT_VERSION,
    exportedAt: meta.exportedAt,
    ...(meta.seedVersion ? { seedVersion: meta.seedVersion } : {}),
    ingredients: sorted(snapshot.ingredients, (i) => i.id),
    templates: sorted(snapshot.templates, (t) => t.id),
    specs: sorted(snapshot.specs, (s) => `${s.lineageId}/${String(s.version).padStart(9, '0')}`),
    affinities: sorted(snapshot.affinities, (a) => a.id),
  };
}

/** The file name `mixtura-backup-2026-11-17.json` from the exported instant. */
export const exportFileName = (exportedAt: string): string =>
  `mixtura-backup-${exportedAt.slice(0, 10)}.json`;
