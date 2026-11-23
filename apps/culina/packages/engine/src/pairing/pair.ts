// Pairings from shared flavour molecules. Two ingredients that have many flavour molecules in
// common are offered as going together; the order is by the share of common molecules among
// those of either (Jaccard index), so that an ingredient with very many molecules does not top
// every list. This is the food pairing hypothesis, a judgement of this project to apply: it was
// found to describe Western cuisines and not East Asian ones (Ahn et al. 2011), and the data has
// no amounts. Docs: docs/decisions/flavordb.md.
import type { Pairing, PairingData, PairingEntity, PairingOptions } from './types';

/** A pairing needs at least this many shared molecules, so that one common trace is no pairing. */
export const MIN_SHARED = 5;
/** An ingredient with fewer molecules than this is known too little to be offered. */
export const MIN_MOLECULES = 10;

/** The molecules both have, ascending. Both lists are ascending and without repeats. */
export function sharedMolecules(a: readonly number[], b: readonly number[]): number[] {
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const x = a[i] as number;
    const y = b[j] as number;
    if (x === y) {
      out.push(x);
      i += 1;
      j += 1;
    } else if (x < y) i += 1;
    else j += 1;
  }
  return out;
}

/** The flavour words of the molecules, by how many of the molecules carry each, then by word. */
export function flavoursOf(
  molecules: readonly number[],
  data: PairingData,
  limit: number,
): string[] {
  const counts = new Map<string, number>();
  for (const id of molecules) {
    for (const word of data.molecules[String(id)]?.flavours ?? []) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
    .map(([word]) => word);
}

const round = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * The ingredients that go with the one asked for, best first: by overlap, then by the number of
 * shared molecules, then by id. Empty when the ingredient is unknown or has no molecules.
 */
export function pairingsFor(
  entityId: number,
  data: PairingData,
  options: PairingOptions = {},
): Pairing[] {
  const limit = options.limit ?? 10;
  const minShared = options.minShared ?? MIN_SHARED;
  const minMolecules = options.minMolecules ?? MIN_MOLECULES;
  const flavourLimit = options.flavourLimit ?? 5;
  const self = data.entities.find((e) => e.id === entityId);
  if (!self || self.molecules.length === 0) return [];
  const found: (Pairing & { common: number[] })[] = [];
  for (const other of data.entities) {
    if (other.id === self.id || other.molecules.length < minMolecules) continue;
    const common = sharedMolecules(self.molecules, other.molecules);
    if (common.length < minShared) continue;
    const either = self.molecules.length + other.molecules.length - common.length;
    found.push({
      id: other.id,
      name: other.name,
      category: other.category,
      shared: common.length,
      overlap: round(common.length / either),
      flavours: [],
      common,
    });
  }
  found.sort((a, b) => b.overlap - a.overlap || b.shared - a.shared || a.id - b.id);
  return found.slice(0, limit).map(({ common, ...pairing }) => ({
    ...pairing,
    flavours: flavoursOf(common, data, flavourLimit),
  }));
}

/** The entity whose name, alias or a synonym is the text, compared without case; undefined when none or several. */
export function entityByName(text: string, data: PairingData): PairingEntity | undefined {
  const wanted = text.trim().toLowerCase();
  if (wanted === '') return undefined;
  const hits = data.entities.filter(
    (e) =>
      e.name.toLowerCase() === wanted ||
      e.alias.toLowerCase() === wanted ||
      (e.synonyms ?? []).some((s) => s.toLowerCase() === wanted),
  );
  return hits.length === 1 ? hits[0] : undefined;
}
