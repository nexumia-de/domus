// What the nutrition section of a classic shows for some portions: the rounded figures per portion,
// what they rest on and what was left out. The engine derives, converts, sums and rounds
// (`deriveClassic`, `dishNutrition`, `roundNutrition`); this only picks the words. Pure: no DOM.
// Never a verdict: no judgement, no colour, no comparison with a daily value.
import { deriveClassic, dishNutrition, roundNutrition } from '@culina/engine';
import type {
  Classic,
  FactsByIngredient,
  IngredientFacts,
  Lang,
  NotCountedLine,
  NutritionById,
  PortionNutrients,
} from '@culina/engine';
import type { IngredientRecord } from '../records';
import { formatNumber } from '../shared/mass';
import { strings } from '../strings';
import type { NameOf } from './dish-view';

const t = strings.nutrition;

/** Finds an ingredient by id: the notebook's own record first, else the catalogue's. */
export type Lookup = (id: string) => IngredientRecord | undefined;

export interface NutritionRow {
  key: 'energy' | 'protein' | 'fat' | 'carbohydrate' | 'fibre' | 'salt';
  label: string;
  value: string;
}

export interface NutritionView {
  portions: number;
  /** Nothing could be counted: no rows. */
  none: boolean;
  /** Too few ingredients are counted for figures worth showing (judgement: none, one, or under a quarter of them): no rows. */
  tooFew: boolean;
  rows: NutritionRow[];
  /** Fibre and salt notes for a figure that is not shown. */
  notShown: string[];
  /** "Counted 6 of 9 ingredients." */
  coverage: string;
  /** "Not counted: ...", absent when everything was counted. */
  notCounted?: string;
  massShare?: string;
}

export type NutritionViewResult = { ok: true; view: NutritionView } | { ok: false; code: string };

const MAX_DEPTH = 12;

/** Figures are shown from two counted ingredients and a quarter of all (a judgement, not a source). */
const MIN_COUNTED = 2;
const MIN_SHARE = 0.25;

/** Density and unit weight of an ingredient; a variety without its own takes its parent's. */
const factsOf = (id: string, lookup: Lookup): IngredientFacts => {
  const facts: { densityGPerMl?: number; unitWeightG?: number } = {};
  let at = lookup(id);
  for (let depth = 0; at !== undefined && depth < MAX_DEPTH; depth++) {
    if (facts.densityGPerMl === undefined && at.densityGPerMl !== undefined)
      facts.densityGPerMl = at.densityGPerMl.value;
    if (facts.unitWeightG === undefined && at.unitWeightG !== undefined)
      facts.unitWeightG = at.unitWeightG.value;
    at = at.parentId === undefined ? undefined : lookup(at.parentId);
  }
  return facts;
};

const number = (n: number): string => formatNumber(n, 3);

const rowsOf = (rounded: PortionNutrients): NutritionRow[] => [
  {
    key: 'energy',
    label: t.energy,
    value: t.energyValue(number(rounded.kcal), number(rounded.kJ)),
  },
  { key: 'protein', label: t.protein, value: t.gramsValue(number(rounded.proteinG)) },
  { key: 'fat', label: t.fat, value: t.gramsValue(number(rounded.fatG)) },
  {
    key: 'carbohydrate',
    label: t.carbohydrate,
    value: t.gramsValue(number(rounded.carbohydrateG)),
  },
  ...(rounded.fibreG === undefined
    ? []
    : [{ key: 'fibre' as const, label: t.fibre, value: t.gramsValue(number(rounded.fibreG)) }]),
  ...(rounded.saltG === undefined
    ? []
    : [{ key: 'salt' as const, label: t.salt, value: t.gramsValue(number(rounded.saltG)) }]),
];

/** The `dish` and `components` of a derived dish, as `dishNutrition` reads them. */
type Derived = Parameters<typeof dishNutrition>[0];

/** The words for the figures of a derived dish; `nameFor` names a line that was not counted. */
function viewOf(
  derived: Derived,
  nameFor: (line: NotCountedLine) => string,
  lookup: Lookup,
): NutritionViewResult {
  const ids = new Set<string>();
  for (const line of [...derived.dish.slots, ...derived.components.flatMap((c) => c.lines)]) {
    if (line.ref?.kind === 'ingredient') ids.add(line.ref.id);
  }
  const facts: Record<string, IngredientFacts> = {};
  const nutrition: Record<string, NutritionById[string]> = {};
  for (const id of ids) {
    facts[id] = factsOf(id, lookup);
    const found = lookup(id)?.['x-nutrition'];
    if (found !== undefined) nutrition[id] = found.per100g;
  }
  const result = dishNutrition(derived, { facts: facts as FactsByIngredient, nutrition });
  if (!result.ok) return { ok: false, code: result.error.code };
  const { coverage } = result;
  const left = coverage.notCounted.map((line) =>
    t.notCountedItem(nameFor(line), t.reasons[line.reason]),
  );
  const rounded = roundNutrition(result.perPortion);
  if (!rounded.ok) return { ok: false, code: rounded.error.code };
  const none = coverage.counted === 0;
  const tooFew =
    none || coverage.counted < MIN_COUNTED || coverage.counted < coverage.total * MIN_SHARE;
  return {
    ok: true,
    view: {
      portions: result.portions,
      none,
      tooFew,
      rows: tooFew ? [] : rowsOf(rounded.rounded),
      notShown: tooFew
        ? []
        : result.notReported.map((k) => (k === 'fibreG' ? t.fibreNotShown : t.saltNotShown)),
      coverage:
        left.length === 0
          ? t.coverageAll(coverage.total)
          : t.coverageSome(coverage.counted, coverage.total),
      ...(left.length === 0 ? {} : { notCounted: t.notCounted(left.join(', ')) }),
      ...(coverage.massShare === undefined || left.length === 0 || none
        ? {}
        : { massShare: t.massShare(String(Math.floor(coverage.massShare * 100))) }),
    },
  };
}

/**
 * The nutrition section of a classic for some portions.
 *
 * @param classic - A shipped classic.
 * @param portions - Portions wanted, above zero.
 * @param lang - The content language.
 * @param nameOf - The name of a catalogue ingredient.
 * @param lookup - Finds an ingredient record by id (notebook first, then the catalogue).
 * @returns The view, or the engine's error code.
 */
export function nutritionView(
  classic: Classic,
  portions: number,
  lang: Lang,
  nameOf: NameOf,
  lookup: Lookup,
): NutritionViewResult {
  const derived = deriveClassic(classic, { portions, lang });
  if (!derived.ok) return { ok: false, code: derived.error.code };
  const componentName = new Map(derived.components.map((c) => [c.id, c.name]));
  return viewOf(
    derived,
    (line) => {
      if (line.wanted !== undefined) return line.wanted;
      if (line.ref === undefined) return '';
      return line.ref.kind === 'component'
        ? (componentName.get(line.ref.id) ?? line.ref.id)
        : nameOf(line.ref.id);
    },
    lookup,
  );
}

/** What an own dish adds up to for the nutrition: its raw ingredients for the portions. */
export interface OwnNutritionInput {
  /** The raw ingredients of the slots that are not optional, in grams for every portion. */
  raw: readonly { ingredientId: string; name: string; g: number }[];
  /** Lines without an amount, and slots that could not be added up: not counted. */
  unmeasured: readonly string[];
  /** Optional slots with their total grams where known: not counted, as on a shipped dish. */
  optional: readonly { name: string; g?: number }[];
}

/**
 * The nutrition section of an own dish for some portions. The raw ingredients come from the
 * engine's expansion (`dishRaw`); here they become the lines `dishNutrition` counts.
 *
 * @param input - The raw ingredients, what has no amount and the optional slots.
 * @param portions - Portions the raw amounts are for, above zero.
 * @param lookup - Finds an ingredient record by id (notebook first, then the catalogue).
 * @returns The view, or the engine's error code.
 */
export function ownNutritionView(
  input: OwnNutritionInput,
  portions: number,
  lookup: Lookup,
): NutritionViewResult {
  const names = new Map<string, string>();
  const slots: Derived['dish']['slots'] = [];
  for (const row of input.raw) {
    names.set(row.ingredientId, row.name);
    slots.push({
      role: 'part',
      ref: { kind: 'ingredient', id: row.ingredientId },
      amount: { value: row.g, unit: 'g' },
    });
  }
  // Lines that have no ingredient to look up get an id of their own that no record has.
  input.unmeasured.forEach((name, i) => {
    const id = `#unmeasured-${i}`;
    names.set(id, name);
    slots.push({ role: 'part', ref: { kind: 'ingredient', id } });
  });
  input.optional.forEach((slot, i) => {
    const id = `#optional-${i}`;
    names.set(id, slot.name);
    slots.push({
      role: 'part',
      ref: { kind: 'ingredient', id },
      ...(slot.g === undefined ? {} : { amount: { value: slot.g, unit: 'g' as const } }),
      optional: true,
    });
  });
  return viewOf(
    { dish: { id: 'own', name: '', portions, slots }, components: [] },
    (line) => (line.ref === undefined ? '' : (names.get(line.ref.id) ?? line.ref.id)),
    lookup,
  );
}
