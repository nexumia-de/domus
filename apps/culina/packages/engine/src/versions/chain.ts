// The chain of a family: which records are its versions, in which order, which one is the
// head, and how variations point at the record they were made from. Pure; no clock.
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
 * The variations made from any version of the family of record `id`: families whose first
 * version has a `parent` in this family. Sorted by the date of the first version, then id.
 */
export function variationsOf<T extends Versioned>(
  records: readonly T[],
  id: string,
): Variation<T>[] {
  const own = records.find((r) => r.id === id);
  if (own === undefined) return [];
  const family = own.version.family;
  const inFamily = new Set(records.filter((r) => r.version.family === family).map((r) => r.id));
  const out: Variation<T>[] = [];
  for (const first of records) {
    const { parent } = first.version;
    if (first.id !== first.version.family || parent === undefined || !inFamily.has(parent))
      continue;
    if (first.version.family === family) continue;
    const head = versionFamily(records, first.id);
    if (head.ok) out.push({ family: first.id, first, head: head.head });
  }
  return out.sort(
    (a, b) =>
      (a.first.version.date < b.first.version.date
        ? -1
        : a.first.version.date > b.first.version.date
          ? 1
          : 0) || (a.family < b.family ? -1 : 1),
  );
}

/**
 * Where the family of record `id` came from: nothing (it did not start as a variation), the
 * record it was made from, or `removed` when that record no longer exists.
 */
export function variationParent<T extends Versioned>(
  records: readonly T[],
  id: string,
): VariationParent<T> {
  const own = records.find((r) => r.id === id);
  if (own === undefined) return { kind: 'none' };
  const first = records.find((r) => r.id === own.version.family);
  const parent = first?.version.parent;
  if (parent === undefined) return { kind: 'none' };
  const record = records.find((r) => r.id === parent);
  return record === undefined || record.version.family === own.version.family
    ? { kind: 'removed' }
    : { kind: 'parent', record };
}
