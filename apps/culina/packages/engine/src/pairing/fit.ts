// How well every candidate fits with what is in the pan, in bands. The score is the one of
// `pairingsForDish` (how far a candidate stands out with the pan's ingredients, measured against
// what is usual for it); here every candidate gets one, not only the best, and a band from fixed
// thresholds. A band describes shared flavour molecules, never whether a pairing is right. A
// candidate the data cannot speak for has the band `none` and comes last: it is not a bad fit.
// The thresholds were read from the shipped data: docs/engine-rules.md#pairing-fit-in-bands.
import { MIN_MOLECULES, moleculeWeights, pairingBaselines, standOut } from './pair';
import type {
  FitBand,
  FitItem,
  FitOptions,
  IngredientFit,
  PairingBaseline,
  PairingData,
  PairingEntity,
} from './types';

/** A score at or above this is a strong fit. */
export const FIT_STRONG = 0.75;
/** A score at or above this, and below `FIT_STRONG`, is some fit; below it, little. */
export const FIT_SOME = 0.25;

/** The band of a score. */
export const bandOf = (score: number): Exclude<FitBand, 'none'> =>
  score >= FIT_STRONG ? 'strong' : score >= FIT_SOME ? 'some' : 'little';

/**
 * Every candidate with its band, by score (best first), then entity id, then the order given; the
 * candidates with the band `none` after them, in the order given. A candidate whose key is in the
 * pan is left out. One that stands for the same entity as an item of the pan is kept and measured
 * against the rest of the pan: the same entity is of the same family and counts 0, as in
 * `pairingsForDish`.
 * @param baselines `pairingBaselines` of the candidates' entities, for a caller that asks often.
 */
export function pairingFit(
  pan: readonly FitItem[],
  candidates: readonly FitItem[],
  data: PairingData,
  options: FitOptions = {},
  weights: ReadonlyMap<number, number> = moleculeWeights(data),
  baselines: ReadonlyMap<number, PairingBaseline> = pairingBaselines(
    data,
    new Set(candidates.flatMap((c) => (c.entity === undefined ? [] : [c.entity]))),
    options,
    weights,
  ),
): IngredientFit[] {
  const minMolecules = options.minMolecules ?? MIN_MOLECULES;
  const byId = new Map(data.entities.map((e) => [e.id, e]));
  const panKeys = new Set(pan.map((p) => p.key));
  const panEntities = new Set(pan.flatMap((p) => (p.entity === undefined ? [] : [p.entity])));
  // The first item of the pan that stands for an entity names it.
  const keyOf = new Map<number, string>();
  for (const item of pan) {
    if (item.entity !== undefined && !keyOf.has(item.entity)) keyOf.set(item.entity, item.key);
  }
  const dish = data.entities.filter((e) => panEntities.has(e.id) && e.molecules.length > 0);
  const scores = new Map<number, { score: number; with: string[] } | undefined>();
  const scoreOf = (entity: PairingEntity | undefined) => {
    if (entity === undefined || dish.length === 0) return undefined;
    if (scores.has(entity.id)) return scores.get(entity.id);
    const usual = baselines.get(entity.id);
    const found =
      entity.molecules.length < minMolecules || !usual || !(usual.spread > 0)
        ? undefined
        : standOut(entity, dish, usual, options, weights);
    const out =
      found === undefined
        ? undefined
        : { score: found.score, with: found.with.map((id) => keyOf.get(id) as string) };
    scores.set(entity.id, out);
    return out;
  };
  const scored: { fit: IngredientFit; score: number; entity: number; at: number }[] = [];
  const unknown: IngredientFit[] = [];
  candidates.forEach((candidate, at) => {
    if (panKeys.has(candidate.key)) return;
    const proven =
      options.proven === undefined
        ? []
        : [...panKeys].filter((key) => options.proven?.(candidate.key, key));
    const entity = candidate.entity === undefined ? {} : { entity: candidate.entity };
    const fit = scoreOf(candidate.entity === undefined ? undefined : byId.get(candidate.entity));
    if (fit === undefined) {
      unknown.push({ key: candidate.key, ...entity, band: 'none', with: [], proven });
      return;
    }
    scored.push({
      fit: {
        key: candidate.key,
        ...entity,
        band: bandOf(fit.score),
        score: fit.score,
        with: fit.with,
        proven,
      },
      score: fit.score,
      entity: candidate.entity as number,
      at,
    });
  });
  scored.sort((a, b) => b.score - a.score || a.entity - b.entity || a.at - b.at);
  return [...scored.map((s) => s.fit), ...unknown];
}
