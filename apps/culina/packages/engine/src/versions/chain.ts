// The chain of a family: which records are its versions, in which order, which one is the
// head, and how variations point at the record they were made from. Pure; no clock.
import { buildFamily, findFamilyCycles } from '../model';
import type { FamilySpec } from '../model';
import type { FamilyResult, Variation, VariationParent, Versioned } from './types';

/** Steps from the first version, following `parent` inside the family; a loop stops the walk. */
const depths = <T extends Versioned>(members: readonly T[]): Map<string, number> => {
  const byId = new Map(members.map((r) => [r.id, r]));
  const out = new Map<string, number>();
  for (const record of members) {
    let depth = 0;
    let at: T | undefined = record;
    const seen = new Set<string>([record.id]);
    while (at?.version.parent !== undefined) {
      const next = byId.get(at.version.parent);
      if (next === undefined || seen.has(next.id)) break;
      seen.add(next.id);
      depth += 1;
      at = next;
    }
    out.set(record.id, depth);
  }
  return out;
};

const order = <T extends Versioned>(members: readonly T[]): T[] => {
  const depth = depths(members);
  return [...members].sort(
    (a, b) =>
      (depth.get(a.id) ?? 0) - (depth.get(b.id) ?? 0) ||
      (a.version.date < b.version.date ? -1 : a.version.date > b.version.date ? 1 : 0) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
};

/**
 * The versions of the family that record `id` belongs to, oldest first, and its head: the
 * version furthest along the parent chain, the latest date and then the id deciding between
 * two that parted. `records` holds every live record of one kind.
 */
export function versionFamily<T extends Versioned>(
  records: readonly T[],
  id: string,
): FamilyResult<T> {
  const found = records.find((r) => r.id === id);
  if (found === undefined) return { ok: false, error: { code: 'unknown-version', id } };
  const versions = order(records.filter((r) => r.version.family === found.version.family));
  return { ok: true, versions, head: versions[versions.length - 1] as T };
}

/** The head of every family, one record each, in the order the records come. */
export function familyHeads<T extends Versioned>(records: readonly T[]): T[] {
  const families = new Map<string, T[]>();
  for (const record of records) {
    const list = families.get(record.version.family);
    if (list) list.push(record);
    else families.set(record.version.family, [record]);
  }
  return [...families.values()].map((members) => {
    const sorted = order(members);
    return sorted[sorted.length - 1] as T;
  });
}

/** The version number of a record in its family (the first is 1), or undefined when unknown. */
export function versionNumber<T extends Versioned>(
  records: readonly T[],
  id: string,
): number | undefined {
  const family = versionFamily(records, id);
  if (!family.ok) return undefined;
  return family.versions.findIndex((r) => r.id === id) + 1;
}

/**
 * The records as materia's `FamilySpec`: lineage = `version.family`, `version` = the number in
 * the chain, and `parentId` (the record a variation was made from) only on a first version.
 */
const specsOf = <T extends Versioned>(records: readonly T[]): FamilySpec[] =>
  records.map((r) => {
    const first = r.id === r.version.family;
    const number = versionNumber(records, r.id) ?? 1;
    return {
      id: r.id,
      lineageId: r.version.family,
      version: number,
      ...(first && r.version.parent !== undefined ? { parentId: r.version.parent } : {}),
      createdAt: r.version.date,
    };
  });

/**
 * The variations made from any version of the family of record `id`: families whose first
 * version has a `parent` in this family, with each head, as materia's `buildFamily` finds them
 * (riffs in order of creation).
 */
export function variationsOf<T extends Versioned>(
  records: readonly T[],
  id: string,
): Variation<T>[] {
  const own = records.find((r) => r.id === id);
  if (own === undefined) return [];
  const family = buildFamily(specsOf(records), own.version.family);
  const out: Variation<T>[] = [];
  for (const lineage of family.children) {
    const first = records.find((r) => r.id === lineage);
    const head = first === undefined ? undefined : versionFamily(records, first.id);
    if (first !== undefined && head?.ok) out.push({ family: lineage, first, head: head.head });
  }
  return out;
}

/**
 * Where the family of record `id` came from: nothing (it did not start as a variation), the
 * record it was made from, or `removed` when that record no longer exists (`missingParent`).
 * A loop of variations is reported by `variationCycles`.
 */
export function variationParent<T extends Versioned>(
  records: readonly T[],
  id: string,
): VariationParent<T> {
  const own = records.find((r) => r.id === id);
  if (own === undefined) return { kind: 'none' };
  const family = buildFamily(specsOf(records), own.version.family);
  if (family.missingParent !== undefined) return { kind: 'removed' };
  const parentId = records.find((r) => r.id === own.version.family)?.version.parent;
  const record = parentId === undefined ? undefined : records.find((r) => r.id === parentId);
  return record === undefined ? { kind: 'none' } : { kind: 'parent', record };
}

/** Loops of variations (a family that is its own ancestor), as lists of family ids. */
export function variationCycles<T extends Versioned>(records: readonly T[]): string[][] {
  return findFamilyCycles(specsOf(records));
}
