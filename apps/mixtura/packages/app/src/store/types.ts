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

/** A place where ingredients are kept; stock is kept per place (docs/data-model.md#place). */
export interface Place {
  id: string;
  name: string;
  updatedAt: string;
}

/** A storage the user configured on this device for sync. Device-local, never exported. */
export interface Storage {
  id: string;
  label: string;
  type: 'webdav';
  baseUrl: string;
  username?: string;
  password?: string;
}

/** The synced units; only places for now. */
export type UnitKind = 'place';

/** Where one synced unit of this device is stored. Device-local, never exported. */
export interface Binding {
  unitKind: UnitKind;
  unitId: string;
  storageId: string;
  folder: string;
  passphrase: string;
  /** The etag of the file as last read or written. */
  etag?: string;
  lastSyncAt?: string;
  lastError?: string;
}

/** The key of a binding in its store. */
export type BindingKey = [unitKind: UnitKind, unitId: string];

/** What the screens read and edit of a stock record: the ingredient and what is known of it. */
export interface StockFields {
  ingredientId: string;
  present: boolean;
  openedOn?: string;
  moreBatches?: string[];
  bestBefore?: string;
  note?: string;
}

/** A live stock record of one place; keyed by `placeId` and `ingredientId`. */
export interface Stock extends StockFields {
  placeId: string;
  updatedAt: string;
}

/** A removed stock record, kept so a merge can tell removed from never entered. */
export interface StockTombstone {
  placeId: string;
  ingredientId: string;
  updatedAt: string;
  deleted: true;
}

export type StockRecord = Stock | StockTombstone;

/** The key of a stock record in its store: place, then ingredient. */
export type StockKey = [placeId: string, ingredientId: string];

/** Which places count (device setting, never exported). */
export interface PlaceSettings {
  /** The places that count for derived views, in order. */
  ticked: string[];
  /** The place new stock entries go to. */
  entry: string;
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
  places: PlaceSettings;
}

export type EntityKind = 'ingredient' | 'template' | 'spec' | 'place' | 'stock' | 'affinity';
/** Device-local records: validated like entities, but not entities (never exported, no backup count). */
export type DeviceKind = 'storage' | 'binding';
