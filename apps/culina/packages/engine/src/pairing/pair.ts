// Pairings from shared flavour molecules. Two ingredients that have flavour molecules in common
// are offered as going together. A molecule counts by how rare it is: one found in a tenth of
// all ingredients says little, one found in three says much. The real data made that necessary:
// about 170 of FlavorDB's 936 ingredients carry the same block of some 93 common molecules, and
// counted plainly that block decided every list. The order is by the weight of the common
// molecules over the weight of the molecules of either. By default an ingredient of the same
// family (fruit with fruit, cheese with cheese) is left out: that is likeness, which a cook
// knows, not a pairing. This is the food pairing hypothesis, a judgement of this project to
// apply: it was found to describe Western cuisines and not East Asian ones (Ahn et al. 2011),
// and the data has no amounts. Docs: docs/decisions/flavordb.md.
import type {
  DishPairing,
  Pairing,
  PairingBaseline,
  PairingData,
  PairingEntity,
  PairingOptions,
} from './types';

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

/**
 * The weight of every molecule: the natural logarithm of the number of ingredients over the
 * number of ingredients that have it. A molecule every ingredient has weighs 0.
 */
export function moleculeWeights(data: PairingData): Map<number, number> {
  const found = new Map<number, number>();
  for (const entity of data.entities) {
    for (const id of entity.molecules) found.set(id, (found.get(id) ?? 0) + 1);
  }
  const weights = new Map<number, number>();
  for (const [id, count] of found) weights.set(id, Math.log(data.entities.length / count));
  return weights;
}

/** The family of a category: its first part, lower case (`fruit-berry` and `Fruit` are `fruit`). */
export const familyOf = (category: string): string =>
  (category.split('-')[0] ?? '').trim().toLowerCase();

/** The flavour words of the molecules, by the weight of the molecules that carry each, then by word. */
export function flavoursOf(
  molecules: readonly number[],
  data: PairingData,
  limit: number,
  weights: ReadonlyMap<number, number> = moleculeWeights(data),
): string[] {
  const sums = new Map<string, number>();
  for (const id of molecules) {
    const weight = weights.get(id) ?? 0;
    for (const word of data.molecules[String(id)]?.flavours ?? []) {
      sums.set(word, (sums.get(word) ?? 0) + weight);
    }
  }
  return [...sums]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
    .map(([word]) => word);
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
const weigh = (molecules: readonly number[], weights: ReadonlyMap<number, number>): number =>
  molecules.reduce((sum, id) => sum + (weights.get(id) ?? 0), 0);

/**
 * The ingredients that go with the one asked for, best first: by overlap, then by the number of
 * shared molecules, then by id. Empty when the ingredient is unknown or has no molecules.
 * @param weights `moleculeWeights(data)`, for a caller that asks often; computed when absent.
 */
export function pairingsFor(
  entityId: number,
  data: PairingData,
  options: PairingOptions = {},
  weights: ReadonlyMap<number, number> = moleculeWeights(data),
): Pairing[] {
  const limit = options.limit ?? 10;
  const minShared = options.minShared ?? MIN_SHARED;
  const minMolecules = options.minMolecules ?? MIN_MOLECULES;
  const flavourLimit = options.flavourLimit ?? 5;
  const self = data.entities.find((e) => e.id === entityId);
  if (!self || self.molecules.length === 0) return [];
  const family = familyOf(self.category);
  const own = weigh(self.molecules, weights);
  const found: (Pairing & { common: number[] })[] = [];
  for (const other of data.entities) {
    if (other.id === self.id || other.molecules.length < minMolecules) continue;
    if (options.sameFamily !== true && familyOf(other.category) === family) continue;
    const common = sharedMolecules(self.molecules, other.molecules);
    if (common.length < minShared) continue;
    const both = weigh(common, weights);
    const either = own + weigh(other.molecules, weights) - both;
    found.push({
      id: other.id,
      name: other.name,
      category: other.category,
      shared: common.length,
      overlap: either > 0 ? round(both / either) : 0,
      flavours: [],
      common,
    });
  }
  found.sort((a, b) => b.overlap - a.overlap || b.shared - a.shared || a.id - b.id);
  return found.slice(0, limit).map(({ common, ...pairing }) => ({
    ...pairing,
    flavours: flavoursOf(common, data, flavourLimit, weights),
  }));
}

/** The overlap of two ingredients: 0 when they share fewer than `minShared` molecules. */
function overlapOf(
  a: PairingEntity,
  b: PairingEntity,
  minShared: number,
  weights: ReadonlyMap<number, number>,
): { overlap: number; shared: number[] } {
  const shared = sharedMolecules(a.molecules, b.molecules);
  if (shared.length < minShared) return { overlap: 0, shared: [] };
  const both = weigh(shared, weights);
  const either = weigh(a.molecules, weights) + weigh(b.molecules, weights) - both;
  return { overlap: either > 0 ? both / either : 0, shared };
}

/**
 * What is usual for an ingredient: the mean and the spread (population standard deviation) of
 * its overlaps with every ingredient of another family that has at least `minMolecules`
 * molecules. An ingredient with very many molecules overlaps with everything; measured against
 * its own usual overlap it stands out only where it overlaps more than it usually does.
 * @param ids The ingredients to measure; all when absent, which takes time on the whole data.
 */
export function pairingBaselines(
  data: PairingData,
  ids?: ReadonlySet<number>,
  options: PairingOptions = {},
  weights: ReadonlyMap<number, number> = moleculeWeights(data),
): Map<number, PairingBaseline> {
  const minShared = options.minShared ?? MIN_SHARED;
  const minMolecules = options.minMolecules ?? MIN_MOLECULES;
  const known = data.entities.filter((e) => e.molecules.length >= minMolecules);
  const out = new Map<number, PairingBaseline>();
  for (const entity of known) {
    if (ids !== undefined && !ids.has(entity.id)) continue;
    const family = familyOf(entity.category);
    let n = 0;
    let sum = 0;
    let squares = 0;
    for (const other of known) {
      if (other.id === entity.id) continue;
      if (options.sameFamily !== true && familyOf(other.category) === family) continue;
      const { overlap } = overlapOf(entity, other, minShared, weights);
      n += 1;
      sum += overlap;
      squares += overlap * overlap;
    }
    if (n === 0) continue;
    const mean = sum / n;
    out.set(entity.id, { mean, spread: Math.sqrt(Math.max(0, squares / n - mean * mean)) });
  }
  return out;
}

/**
 * What goes with a dish: the ingredients that stand out with those of the dish, best first. For
 * each ingredient of the dish of another family, the candidate's overlap is measured against
 * what is usual for the candidate (`pairingBaselines`): how many spreads above its mean. The
 * score is the sum of these over the dish's ingredients, divided by their number; a candidate
 * scoring 0 or less is not offered. The order is by score, then by id. What is in the dish is
 * not offered.
 * @param candidates When given, only these ingredients are offered (the ones the app can name).
 * @param baselines `pairingBaselines` of the candidates, for a caller that asks often.
 */
export function pairingsForDish(
  dishEntityIds: readonly number[],
  data: PairingData,
  options: PairingOptions = {},
  candidates?: ReadonlySet<number>,
  weights: ReadonlyMap<number, number> = moleculeWeights(data),
  baselines: ReadonlyMap<number, PairingBaseline> = pairingBaselines(
    data,
    candidates,
    options,
    weights,
  ),
): DishPairing[] {
  const limit = options.limit ?? 10;
  const minShared = options.minShared ?? MIN_SHARED;
  const minMolecules = options.minMolecules ?? MIN_MOLECULES;
  const flavourLimit = options.flavourLimit ?? 5;
  const inDish = new Set(dishEntityIds);
  const dish = data.entities.filter((e) => inDish.has(e.id) && e.molecules.length > 0);
  if (dish.length === 0) return [];
  const found: (DishPairing & { common: Set<number> })[] = [];
  for (const other of data.entities) {
    if (inDish.has(other.id) || other.molecules.length < minMolecules) continue;
    if (candidates !== undefined && !candidates.has(other.id)) continue;
    const usual = baselines.get(other.id);
    if (!usual || !(usual.spread > 0)) continue;
    const family = familyOf(other.category);
    const pairs: { id: number; above: number }[] = [];
    const common = new Set<number>();
    let sum = 0;
    for (const entity of dish) {
      if (options.sameFamily !== true && familyOf(entity.category) === family) continue;
      const { overlap, shared } = overlapOf(entity, other, minShared, weights);
      if (shared.length === 0) continue;
      const above = (overlap - usual.mean) / usual.spread;
      sum += above;
      if (above > 0) {
        pairs.push({ id: entity.id, above });
        for (const id of shared) common.add(id);
      }
    }
    const score = round(sum / dish.length);
    if (!(score > 0) || pairs.length === 0) continue;
    pairs.sort((a, b) => b.above - a.above || a.id - b.id);
    found.push({
      id: other.id,
      name: other.name,
      category: other.category,
      score,
      with: pairs.map((p) => p.id),
      flavours: [],
      common,
    });
  }
  found.sort((a, b) => b.score - a.score || a.id - b.id);
  return found.slice(0, limit).map(({ common, ...pairing }) => ({
    ...pairing,
    flavours: flavoursOf(
      [...common].sort((a, b) => a - b),
      data,
      flavourLimit,
      weights,
    ),
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
