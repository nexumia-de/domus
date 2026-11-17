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
  parentId?: string;
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

/** Backup reminder state (docs/export-format.md#backup-reminder). Instants are ISO 8601 UTC. */
export interface Backup {
  lastExportAt?: string;
  /** Committed entity writes and deletes since the last export. */
  changesSinceExport: number;
  /** When the first of those changes happened; the reminder counts days from here. */
  firstChangeAt?: string;
  dismissedAt?: string;
}

/** Device settings; they are not part of the export file. */
export type BuyNextMode = 'with-substitutes' | 'strict';
export type YesNo = 'yes' | 'no';

export interface Settings {
  theme: Theme;
  units: Units;
  /** Id of the "without alcohol" threshold preset (engine `ALCOHOL_PRESETS`). */
  alcoholWithout: string;
  /** Id of the low-ABV threshold preset. */
  alcoholLow: string;
  /** Buy Next: count drinks that need a substitute (`with-substitutes`) or only exact ones (`strict`). */
  buyNextMode: BuyNextMode;
  /** Buy Next ranks drafts and retired drinks: `yes` or `no`. */
  buyNextDrafts: YesNo;
  buyNextRetired: YesNo;
  backup: Backup;
}

export type EntityKind = 'ingredient' | 'template' | 'spec' | 'stock' | 'affinity';
