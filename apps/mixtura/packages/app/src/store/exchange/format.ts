// The export file (docs/data-model.md#export-file, docs/export-format.md):
// its shape, the current format version, and building the object from a
// snapshot of the user's data. Pure: the instant and the versions come from
// the host.

import type { Affinity, Ingredient, Spec, Stock, Template } from '../types';

export const FORMAT_VERSION = 1;
export const APP_TAG = 'mixtura';
/** Largest file the importer reads; a full bar is a few hundred kilobytes. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Everything the user entered, as it lives in the five user stores. */
export interface Snapshot {
  ingredients: Ingredient[];
  templates: Template[];
  specs: Spec[];
  stock: Stock[];
  affinities: Affinity[];
}

export const KINDS = ['ingredients', 'templates', 'specs', 'stock', 'affinities'] as const;
export type Kind = (typeof KINDS)[number];

export interface ExportFile extends Snapshot {
  app: typeof APP_TAG;
  formatVersion: number;
  exportedAt: string;
  seedVersion?: string;
}

export type Counts = Record<Kind, number>;

export const emptySnapshot = (): Snapshot => ({
  ingredients: [],
  templates: [],
  specs: [],
  stock: [],
  affinities: [],
});

export const countsOf = (snapshot: Snapshot): Counts => ({
  ingredients: snapshot.ingredients.length,
  templates: snapshot.templates.length,
  specs: snapshot.specs.length,
  stock: snapshot.stock.length,
  affinities: snapshot.affinities.length,
});

export const total = (counts: Counts): number => KINDS.reduce((sum, k) => sum + counts[k], 0);

/** Records sorted by key so two exports of the same data are identical. */
function sorted<T>(list: readonly T[], key: (item: T) => string): T[] {
  return [...list].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

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
    stock: sorted(snapshot.stock, (s) => s.ingredientId),
    affinities: sorted(snapshot.affinities, (a) => a.id),
  };
}

/** `mixtura-backup-2026-11-17.json` from the exported instant. */
export const exportFileName = (exportedAt: string): string =>
  `mixtura-backup-${exportedAt.slice(0, 10)}.json`;
