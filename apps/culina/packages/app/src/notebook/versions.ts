// What the screens read about versions: the head of a family, its chain, variations and
// tasting notes. Every record of a component or dish is one version; lists show the heads.
import {
  familyHeads,
  variationParent,
  variationsOf,
  versionFamily,
  versionNumber,
} from '@culina/engine';
import type { Variation, VariationParent } from '@culina/engine';
import type { ComponentRecord, DishRecord, TastingRecord } from '../records';
import { state } from './state';

export type VersionKind = 'components' | 'dishes';
type Rec<K extends VersionKind> = K extends 'components' ? ComponentRecord : DishRecord;

const all = <K extends VersionKind>(kind: K): readonly Rec<K>[] =>
  (kind === 'components' ? state.components : state.dishes) as unknown as readonly Rec<K>[];

/** Every live record of the kind, all versions. */
export const allVersions = <K extends VersionKind>(kind: K): readonly Rec<K>[] => all(kind);

export const allTastings = (): readonly TastingRecord[] => state.tastings;

/** One record per family: its head. */
export const headsOf = <K extends VersionKind>(kind: K): Rec<K>[] => familyHeads(all(kind));

/** The record with exactly this id (any version). */
export const versionRecord = <K extends VersionKind>(kind: K, id: string): Rec<K> | undefined =>
  all(kind).find((r) => r.id === id);

/** The head of the family of record `id`; undefined when `id` is no record. */
export const headOfFamily = <K extends VersionKind>(kind: K, id: string): Rec<K> | undefined => {
  const family = versionFamily(all(kind), id);
  return family.ok ? family.head : undefined;
};

/** Oldest first; empty when `id` is no record. */
export const versionChain = <K extends VersionKind>(kind: K, id: string): Rec<K>[] => {
  const family = versionFamily(all(kind), id);
  return family.ok ? family.versions : [];
};

export const numberOf = (kind: VersionKind, id: string): number | undefined =>
  versionNumber(all(kind), id);

export const variationsFor = <K extends VersionKind>(kind: K, id: string): Variation<Rec<K>>[] =>
  variationsOf(all(kind), id);

export const parentOf = <K extends VersionKind>(kind: K, id: string): VariationParent<Rec<K>> =>
  variationParent(all(kind), id);

/** The notes of one version record, oldest first. */
export const tastingsOf = (versionId: string): TastingRecord[] =>
  state.tastings
    .filter((t) => t.ref.id === versionId)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));

export const getTasting = (id: string): TastingRecord | undefined =>
  state.tastings.find((t) => t.id === id);
