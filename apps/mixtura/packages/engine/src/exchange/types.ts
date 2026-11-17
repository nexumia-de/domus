// Shapes of the export file (docs/data-model.md#export-file,
// docs/export-format.md): the five kinds of records the user entered, the
// file around them and the counts the import preview shows. The records are
// typed by the fields the exchange reads; the JSON Schemas check the rest.

import type { Ingredient } from '../drink-ingredients/types';

/** The version of the export format this build writes and reads. */
export const FORMAT_VERSION = 1;
export const APP_TAG = 'mixtura';
/** Largest file the importer reads; a full bar is a few hundred kilobytes. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export interface ExchangeSpec {
  id: string;
  lineageId: string;
  version: number;
  name: string;
  status: 'draft' | 'on-menu' | 'retired';
  templateId?: string;
  parentId?: string;
  [field: string]: unknown;
}

export interface ExchangeTemplate {
  id: string;
  name: string;
  parentId?: string;
  [field: string]: unknown;
}

export interface ExchangeAffinity {
  id: string;
  ingredients: [string, string];
  [field: string]: unknown;
}

export interface ExchangeStock {
  ingredientId: string;
  present: boolean;
  openedOn?: string;
  bestBefore?: string;
  note?: string;
}

/** Everything the user entered, as it lives in the five user stores. */
export interface Snapshot {
  ingredients: Ingredient[];
  templates: ExchangeTemplate[];
  specs: ExchangeSpec[];
  stock: ExchangeStock[];
  affinities: ExchangeAffinity[];
}

/** The five kinds of user records an export holds, in the order of the file. */
export const KINDS = ['ingredients', 'templates', 'specs', 'stock', 'affinities'] as const;
export type Kind = (typeof KINDS)[number];

export interface ExportFile extends Snapshot {
  app: typeof APP_TAG;
  formatVersion: number;
  exportedAt: string;
  seedVersion?: string;
}

export type Counts = Record<Kind, number>;
