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

/**
 * A space as the stock screens need it: the host's space without its secret
 * and storage access (docs/data-model.md#stock).
 */
export interface Space {
  /** The space id derived from its secret (32 hex characters). */
  id: string;
  name: string;
  /** True when the space has no storage: it is on this device only and never synced. */
  deviceOnly: boolean;
}

/** What the screens read and edit of a stock record: the ingredient and what is known of it. */
export interface StockFields {
  ingredientId: string;
  present: boolean;
  openedOn?: string;
  moreBatches?: string[];
  bestBefore?: string;
  note?: string;
}

/** A live stock record of one space: the collection's record with its space and key (stock/source.ts). */
export interface Stock extends StockFields {
  spaceId: string;
  updatedAt: string;
}

/** A removed stock record, kept so a merge can tell removed from never entered. */
export interface StockTombstone {
  spaceId: string;
  ingredientId: string;
  updatedAt: string;
  deleted: true;
}

export type StockRecord = Stock | StockTombstone;

/** Which spaces count for stock (device setting, never exported). */
export interface SpaceSettings {
  /** The spaces that count for derived views, in order. */
  ticked: string[];
  /** The space new stock entries go to. */
  entry: string;
  /** The spaces this device has seen; one that is not in the list is new and counts at once. */
  known: string[];
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
  spaces: SpaceSettings;
}

export type EntityKind = 'ingredient' | 'template' | 'spec' | 'affinity';
