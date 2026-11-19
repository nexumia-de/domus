// Shapes of the export file (docs/data-model.md#export-file,
// docs/export-format.md): the six kinds of records the user entered, the
// file around them and the counts the import preview shows. The records are
// typed by the fields the exchange reads; the JSON Schemas check the rest.

import type { Ingredient } from '../drink-ingredients/types';

/** The version of the export format this build writes and reads. */
export const FORMAT_VERSION = 2;
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

export interface ExchangePlace {
  id: string;
  name: string;
  updatedAt: string;
}

/** A stock record of one place: live, or a tombstone for a removed one (docs/data-model.md#stock). */
export type ExchangeStock =
  | {
      placeId: string;
      ingredientId: string;
      updatedAt: string;
      present: boolean;
      openedOn?: string;
      moreBatches?: string[];
      bestBefore?: string;
      note?: string;
      deleted?: undefined;
    }
  | { placeId: string; ingredientId: string; updatedAt: string; deleted: true };

/** Everything the user entered, as it lives in the six user stores. */
export interface Snapshot {
  ingredients: Ingredient[];
  templates: ExchangeTemplate[];
  specs: ExchangeSpec[];
  places: ExchangePlace[];
  stock: ExchangeStock[];
  affinities: ExchangeAffinity[];
}

/** The six kinds of user records an export holds, in the order of the file; places come before the stock that names them. */
export const KINDS = [
  'ingredients',
  'templates',
  'specs',
  'places',
  'stock',
  'affinities',
] as const;
export type Kind = (typeof KINDS)[number];

export interface ExportFile extends Snapshot {
  app: typeof APP_TAG;
  formatVersion: number;
  exportedAt: string;
  seedVersion?: string;
}

export type Counts = Record<Kind, number>;
