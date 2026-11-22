// What the nutrition section of a classic shows for some portions: the rounded figures per portion,
// what they rest on and what was left out. The engine derives, converts, sums and rounds
// (`deriveClassic`, `lineFigures`, `dishNutrition`, `roundNutrition`) and says whether the figures
// mean anything; this only picks the words. Pure: no DOM.
// Never a verdict: no judgement, no colour, no comparison with a daily value.
import { deriveClassic, dishNutrition, lineFigures, roundNutrition } from '@culina/engine';
import type {
  Classic,
  FactsByIngredient,
  FigureRecord,
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
  /**
   * The figures would mislead, so none are shown (the engine's `shown`): nothing is counted, or an
   * ingredient with an amount that is no seasoning is left out. No rows; `why` says which.
   */
  tooFew: boolean;
  /** Why no figures are shown; absent when they are. */
  why?: string;
  /** "Counted as the usual kind ...": lines that name a group, counted with its usual member. */
  asUsual?: string;
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

/** USDA's food category for seasonings: a line of it left out does not hide the figures. */
export const SEASONING_CATEGORY = 'Spices and Herbs';

/** The record as the engine's figure rule reads it; the usual member is `x-group.usual.id`. */
const figureRecord = (record: IngredientRecord): FigureRecord => {
  const usual = (record['x-group'] as { usual?: { id?: unknown } } | undefined)?.usual?.id;
  const nutrition = record['x-nutrition']?.per100g;
  return {
    ...(record.parentId === undefined ? {} : { parentId: record.parentId }),
    ...(record.densityGPerMl === undefined ? {} : { densityGPerMl: record.densityGPerMl.value }),
    ...(record.unitWeightG === undefined ? {} : { unitWeightG: record.unitWeightG.value }),
    ...(nutrition === undefined ? {} : { nutrition }),
    ...(typeof usual === 'string' ? { usualId: usual } : {}),
  };
};

/** USDA's category of the record or of the nearest record above it that has one. */
const categoryOf = (id: string, lookup: Lookup): string | undefined => {
  let at = lookup(id);
  for (let depth = 0; at !== undefined && depth < MAX_DEPTH; depth++) {
    const category = at['x-fdc']?.category ?? at['x-group']?.category;
    if (category !== undefined) return category;
    at = at.parentId === undefined ? undefined : lookup(at.parentId);
  }
  return undefined;
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
  nameOfId: (id: string) => string,
  lookup: Lookup,
): NutritionViewResult {
  const ids = new Set<string>();
  for (const line of [...derived.dish.slots, ...derived.components.flatMap((c) => c.lines)]) {
    if (line.ref?.kind === 'ingredient') ids.add(line.ref.id);
  }
  const find = (id: string): FigureRecord | undefined => {
    const record = lookup(id);
    return record === undefined ? undefined : figureRecord(record);
  };
  const facts: Record<string, IngredientFacts> = {};
  const nutrition: Record<string, NutritionById[string]> = {};
  const seasonings: string[] = [];
  const usualOf = new Map<string, string>();
  for (const id of ids) {
    const figures = lineFigures(id, find);
    facts[id] = figures.facts;
    if (figures.nutrition !== undefined) nutrition[id] = figures.nutrition;
    const usual = Object.values(figures.from).find((o) => o.by === 'usual');
    if (usual !== undefined) usualOf.set(id, usual.id);
    if (categoryOf(id, lookup) === SEASONING_CATEGORY) seasonings.push(id);
  }
  const result = dishNutrition(derived, {
    facts: facts as FactsByIngredient,
    nutrition,
    seasonings,
  });
  if (!result.ok) return { ok: false, code: result.error.code };
  const { coverage, shown } = result;
  const left = coverage.notCounted.map((line) =>
    t.notCountedItem(nameFor(line), t.reasons[line.reason]),
  );
  const rounded = roundNutrition(result.perPortion);
  if (!rounded.ok) return { ok: false, code: rounded.error.code };
  const none = coverage.counted === 0;
  const tooFew = !shown.figures;
  const why = shown.figures
    ? undefined
    : shown.why === 'nothing-counted'
      ? t.tooFew
      : t.notShownLeftOut([...new Set(shown.lines.map(nameFor))].join(', '));
  // A line that names a group and was counted with the group's usual member says so.
  const leftIds = new Set(coverage.notCounted.flatMap((l) => (l.ref ? [l.ref.id] : [])));
  const usual = [...usualOf]
    .filter(([id]) => !leftIds.has(id))
    .map(([id, member]) => t.usualItem(nameOfId(id), nameOfId(member)));
  return {
    ok: true,
    view: {
      portions: result.portions,
      none,
      tooFew,
      ...(why === undefined ? {} : { why }),
      ...(usual.length === 0 ? {} : { asUsual: t.asUsual(usual.join(', ')) }),
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
    nameOf,
    lookup,
  );
}

/** What an own dish adds up to for the nutrition: its raw ingredients for the portions. */
export interface OwnNutritionInput {
  /** The raw ingredients of the slots that are not optional, in grams for every portion. */
  raw: readonly { ingredientId: string; name: string; g: number }[];
  /** Lines without an amount: not counted, and they do not hide the figures. */
  unmeasured: readonly string[];
  /**
   * Slots with an amount that could not be added up (no weight known): not counted, and they hide
   * the figures, as a shipped line whose weight is unknown does.
   */
  unweighed?: readonly string[];
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
 * @param nameOf - The name of an ingredient in the user's language, for the usual member of a group.
 * @returns The view, or the engine's error code.
 */
export function ownNutritionView(
  input: OwnNutritionInput,
  portions: number,
  lookup: Lookup,
  nameOf?: NameOf,
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
  // An amount the engine cannot weigh: one piece of an ingredient that no record has.
  (input.unweighed ?? []).forEach((name, i) => {
    const id = `#unweighed-${i}`;
    names.set(id, name);
    slots.push({
      role: 'part',
      ref: { kind: 'ingredient', id },
      amount: { value: 1, unit: 'count' },
    });
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
    (id) => names.get(id) ?? nameOf?.(id) ?? lookup(id)?.name ?? id,
    lookup,
  );
}
