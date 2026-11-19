// Nutrition of a derived dish per portion. Every line with an amount is turned into grams (mass
// directly, volume by the ingredient's density, count by its unit weight), multiplied by the
// ingredient's figures per 100 g, summed and divided by the portions. A line that cannot be
// counted is left out and listed with its reason: the figures say how much they rest on.
// Amounts are used as the source gives them (raw, as bought); no edible portion and no cooking
// loss is applied. Nothing is rounded here: see `roundNutrition`.
import { toGrams } from '../amounts/convert';
import type { Amount, ConvertError } from '../amounts/types';
import type { ComponentRef, FactsByIngredient } from '../components/types';
import type { DerivedComponent, DerivedDish, DerivedLine, DerivedSlot } from '../classics/derive';
import type {
  NotCountedLine,
  NotCountedReason,
  NutrientsPer100g,
  NutritionById,
  NutritionResult,
  PortionNutrients,
} from './types';

/** Salt = sodium x 2.5 (Regulation (EU) No 1169/2011, Annex I, point 11). */
export const SALT_PER_SODIUM = 2.5;

export interface DishNutritionInput {
  /** Density and unit weight per ingredient id, as for the conversions. */
  facts: FactsByIngredient;
  /** The figures per 100 g per ingredient id. */
  nutrition: NutritionById;
}

const CORE = ['kcal', 'kJ', 'proteinG', 'fatG', 'carbohydrateG'] as const;

const usable = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

/** Trims binary noise (12 significant digits). */
const clean = (n: number): number => Number(n.toPrecision(12));

interface Leaf {
  componentId?: string;
  index: number;
  line: DerivedLine | DerivedSlot;
  optional: boolean;
}

/** The ingredient lines of the dish: components are written out; their own amounts are not used. */
function leaves(
  dish: DerivedDish,
  components: readonly DerivedComponent[],
  unknown: NotCountedLine[],
): Leaf[] {
  const byId = new Map(components.map((c) => [c.id, c]));
  const out: Leaf[] = [];
  const walk = (
    line: DerivedLine | DerivedSlot,
    where: { componentId?: string; index: number },
    stack: readonly string[],
    optional: boolean,
  ): void => {
    const ref = line.ref;
    if (ref?.kind === 'component') {
      const c = byId.get(ref.id);
      if (c === undefined || stack.includes(c.id)) {
        unknown.push({ ...where, ref, reason: 'unknown-component' });
        return;
      }
      c.lines.forEach((l, i) =>
        walk(l, { componentId: c.id, index: i }, [...stack, c.id], optional),
      );
      return;
    }
    out.push({ ...where, line, optional });
  };
  dish.slots.forEach((s, i) => walk(s, { index: i }, [], s.optional === true));
  return out;
}

const place = (leaf: Leaf): Pick<NotCountedLine, 'componentId' | 'index'> => ({
  ...(leaf.componentId === undefined ? {} : { componentId: leaf.componentId }),
  index: leaf.index,
});

const who = (line: DerivedLine | DerivedSlot): { ref?: ComponentRef; wanted?: string } => ({
  ...(line.ref === undefined ? {} : { ref: line.ref }),
  ...(line.wanted === undefined ? {} : { wanted: line.wanted }),
});

/**
 * The figures of a derived dish per portion, with their coverage.
 *
 * Counted: a line of an ingredient with figures whose amount converts to grams. Left out, with
 * the reason: a `wanted` line, a line without amount, an amount that cannot be converted, an
 * ingredient without figures, an optional ingredient. Fibre and salt are reported only when every
 * counted line has the figure (`notReported` names the ones that are not). `massShare` is the
 * counted mass over the mass of all lines whose mass is known, and is absent when a line left out
 * has no known mass.
 *
 * @param derived - The `dish` and `components` of a `deriveClassic` result.
 * @param input - Facts (density, unit weight) and figures per 100 g by ingredient id.
 * @returns The figures per portion and the coverage; `invalid-portions` when the dish's portions
 * are not above zero; `invalid-nutrition` (with the ingredient) when a used figure is negative or
 * not a number.
 */
export function dishNutrition(
  derived: { dish: DerivedDish; components: readonly DerivedComponent[] },
  input: DishNutritionInput,
): NutritionResult {
  const { dish, components } = derived;
  if (!usable(dish.portions) || dish.portions === 0) {
    return { ok: false, error: { code: 'invalid-portions' } };
  }
  const notCounted: NotCountedLine[] = [];
  const all = leaves(dish, components, notCounted);
  const sums = { kcal: 0, kJ: 0, proteinG: 0, fatG: 0, carbohydrateG: 0, fibreG: 0, sodiumMg: 0 };
  let hasFibre = true;
  let hasSodium = true;
  let counted = 0;
  let countedG = 0;
  let knownLeftG = 0;
  const unknownComponents = notCounted.length;
  let leftUnknown = unknownComponents > 0;
  for (const leaf of all) {
    const { line } = leaf;
    const left = (reason: NotCountedReason, missing?: string[]): void => {
      notCounted.push({
        ...place(leaf),
        ...who(line),
        reason,
        ...(missing === undefined ? {} : { missing }),
      });
    };
    const amount: Amount | undefined = line.amount;
    if (line.ref === undefined) {
      left('wanted');
      leftUnknown = true;
      continue;
    }
    if (amount === undefined) {
      left('no-amount');
      leftUnknown = true;
      continue;
    }
    const converted = toGrams(amount, input.facts[line.ref.id]);
    if (!converted.ok) {
      left('cannot-convert', missingOf(converted.error));
      leftUnknown = true;
      continue;
    }
    const g = converted.g;
    if (leaf.optional) {
      left('optional');
      knownLeftG += g;
      continue;
    }
    const figures: NutrientsPer100g | undefined = input.nutrition[line.ref.id];
    if (figures === undefined || CORE.some((k) => figures[k] === undefined)) {
      left('no-nutrition');
      knownLeftG += g;
      continue;
    }
    for (const k of [...CORE, 'fibreG', 'sodiumMg'] as const) {
      const v = figures[k];
      if (v !== undefined && !usable(v)) {
        return { ok: false, error: { code: 'invalid-nutrition', ingredient: line.ref.id } };
      }
    }
    for (const k of CORE) sums[k] += (figures[k] * g) / 100;
    if (figures.fibreG === undefined) hasFibre = false;
    else sums.fibreG += (figures.fibreG * g) / 100;
    if (figures.sodiumMg === undefined) hasSodium = false;
    else sums.sodiumMg += (figures.sodiumMg * g) / 100;
    counted += 1;
    countedG += g;
  }
  const n = dish.portions;
  const perPortion: PortionNutrients = {
    kcal: clean(sums.kcal / n),
    kJ: clean(sums.kJ / n),
    proteinG: clean(sums.proteinG / n),
    fatG: clean(sums.fatG / n),
    carbohydrateG: clean(sums.carbohydrateG / n),
  };
  const notReported: ('fibreG' | 'saltG')[] = [];
  if (counted > 0 && !hasFibre) notReported.push('fibreG');
  else perPortion.fibreG = clean(sums.fibreG / n);
  if (counted > 0 && !hasSodium) notReported.push('saltG');
  else perPortion.saltG = clean(((sums.sodiumMg / 1000) * SALT_PER_SODIUM) / n);
  const whole = countedG + knownLeftG;
  return {
    ok: true,
    portions: n,
    perPortion,
    countedGPerPortion: clean(countedG / n),
    coverage: {
      counted,
      total: all.length + unknownComponents,
      ...(leftUnknown ? {} : { massShare: whole === 0 ? 1 : clean(countedG / whole) }),
      notCounted,
    },
    notReported,
  };
}

const missingOf = (error: ConvertError): string[] | undefined =>
  error.missing ??
  (error.code === 'needs-density'
    ? ['densityGPerMl']
    : error.code === 'needs-unit-weight'
      ? ['unitWeightG']
      : undefined);
