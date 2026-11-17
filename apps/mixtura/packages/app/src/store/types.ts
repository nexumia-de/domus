// Entity types of the user stores. Field lists are in docs/data-model.md and
// enforced by the JSON Schemas on every write; the types here name only the
// fields the store itself reads (ids, keys, indexes).

import type { Ingredient } from '@mixtura/engine';

export type { Ingredient };

export interface Spec {
  id: string;
  lineageId: string;
  version: number;
  name: string;
  status: 'draft' | 'on-menu' | 'retired';
  templateId?: string;
  [field: string]: unknown;
}

export interface Template {
  id: string;
  name: string;
  parentId?: string;
  [field: string]: unknown;
}

export interface Affinity {
  id: string;
  ingredients: [string, string];
  [field: string]: unknown;
}

export interface Stock {
  ingredientId: string;
  present: boolean;
  openedOn?: string;
  bestBefore?: string;
  note?: string;
}

export type Theme = 'system' | 'light' | 'dark';
export type Units = 'metric' | 'us' | 'imperial';

/** Device settings; they are not part of the export file. */
export interface Settings {
  theme: Theme;
  units: Units;
  /** Reminder state for export (#28); only stored here, counted there. */
  backup: { lastExportAt?: string; changesSinceExport: number; dismissedAt?: string };
}

export type EntityKind = 'ingredient' | 'template' | 'spec' | 'stock' | 'affinity';
