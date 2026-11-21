// A dish as the dish screen and the cook screen show it, whatever its origin: a shipped classic
// (through the engine's `deriveClassic`) or a dish of the notebook (through `slotRows`,
// `dishParts` and `dishRaw`). The same fields mean the same thing for both; a block that only one
// origin has data for is absent on the other. Pure: no DOM; the notebook, the classic, the
// ingredient lookup, the techniques and what is learned come in.
import type { Classic, Lang, Technique } from '@culina/engine';
import { entryOfClassic, entryOfDish, type Origin } from '../browse/entry';
import type { Lookup } from '../characters/classes';
import { cookView, type StepView } from '../classics/cook-view';
import { dishView } from '../classics/dish-view';
import type { ComponentView, DishView, LineView, NameOf } from '../classics/dish-view';
import { nutritionView, ownNutritionView } from '../classics/nutrition-view';
import type { NutritionViewResult } from '../classics/nutrition-view';
import { dishParts, partSteps, type DishCookOptions } from '../components/steps-view';
import type { DishRecord, Notebook } from '../records';
import { dishRaw, type DishRaw } from './raw';
import { slotRows, type SlotRow } from './slots';

export interface ShownDish {
  origin: Origin;
  id: string;
  /** The name in the content language. */
  name: string;
  /** The name in the dish's own language; only a shipped dish has one. */
  originalName?: string;
  /** The course and the cuisine where the dish states them (a word the app does not know stays as it is). */
  course?: string;
  cuisine?: string;
  /** As on the dish's entry in the lists: set by hand for a shipped dish, derived for an own one; absent when not known. */
  meatFree?: boolean;
  /** The user's note on an own dish. */
  note?: string;
  /** The ids of its characters, without "with meat" and "with fish": the quiet line says that. */
  characters: string[];
  portions: number;
  /** The ingredient lines per component, with their amounts for the portions. */
  components: ComponentView[];
  /** The lines of the dish itself: what goes with the components, with their totals. */
  slots: LineView[];
  /** Every step for cooking, in order: the components', then the dish's own. */
  steps: StepView[];
  /** The nutrition per portion and what it rests on. */
  nutrition: NutritionViewResult;
  /** Shipped only: the source, what was settled and the remarks on the source. */
  source?: DishView;
  /** Own only: the role slots (for the slot table and Swap) and the raw ingredients all the way down. */
  fillings?: { rows: SlotRow[]; raw: DishRaw };
}

export type ShownResult = { ok: true; dish: ShownDish } | { ok: false; code: string };

export interface ShownContext {
  lang: Lang;
  /** The name of a catalogue ingredient in the content language. */
  nameOf: NameOf;
  /** Finds an ingredient by id: the notebook's own first, else the catalogue's. */
  lookup: Lookup;
  /** The techniques the app knows, and those the user marked as learned. */
  known: readonly Technique[];
  learned: ReadonlySet<string>;
}

const MEAT_FLAGS: readonly string[] = ['with-meat', 'with-fish'];

const withoutMeatFlags = (ids: readonly string[]): string[] =>
  ids.filter((id) => !MEAT_FLAGS.includes(id));

/**
 * A shipped classic as shown for some portions.
 *
 * @param classic - A shipped classic.
 * @param portions - Portions wanted, above zero.
 * @param ctx - Language, names, lookup, techniques and what is learned.
 * @returns The dish, or the engine's error code (for example `invalid-portions`).
 */
export function shownOfClassic(classic: Classic, portions: number, ctx: ShownContext): ShownResult {
  const shown = dishView(classic, portions, ctx.lang, ctx.nameOf);
  if (!shown.ok) return shown;
  const steps = cookView(classic, portions, ctx.lang, ctx.nameOf, ctx.known, ctx.learned);
  const entry = entryOfClassic(classic, ctx.lookup, ctx.lang);
  const { view } = shown;
  return {
    ok: true,
    dish: {
      origin: 'shipped',
      id: classic.id,
      name: view.name,
      originalName: view.originalName,
      ...(entry.course === undefined ? {} : { course: entry.course }),
      ...(entry.cuisine === undefined ? {} : { cuisine: entry.cuisine }),
      ...(entry.meatFree === undefined ? {} : { meatFree: entry.meatFree }),
      characters: withoutMeatFlags(entry.characters),
      portions: view.portions,
      components: view.components,
      slots: view.slots,
      steps: steps.ok ? steps.steps : [],
      nutrition: nutritionView(classic, portions, ctx.lang, ctx.nameOf, ctx.lookup),
      source: view,
    },
  };
}

/** A text field a dish may have from a newer editor (course, cuisine); anything else is absent. */
const textField = (dish: DishRecord, field: string): string | undefined => {
  const value = (dish as unknown as Record<string, unknown>)[field];
  return typeof value === 'string' && value !== '' ? value : undefined;
};

/**
 * A dish of the notebook as shown for some portions. A component that fills a slot is a group of
 * lines with the amounts the dish needs of it; the slots are the dish's own lines with their
 * totals; the steps are those `dishCookView` cooks.
 *
 * @param nb - The notebook.
 * @param dish - The dish as shown (with any filling swapped for now already applied).
 * @param portions - Portions wanted, above zero.
 * @param ctx - Language, names, lookup, techniques and what is learned.
 * @param options - What is ready in stock, and the wording for it.
 * @returns The dish; an amount that cannot be worked out is left out of its line, never fatal.
 */
export function shownOfDish(
  nb: Notebook,
  dish: DishRecord,
  portions: number,
  ctx: ShownContext,
  options: DishCookOptions,
): ShownDish {
  const rows = slotRows(nb, dish, portions);
  const parts = dishParts(nb, dish, portions, options);
  const entry = entryOfDish(nb, dish, ctx.lookup);
  const course = entry.course ?? textField(dish, 'course');
  const cuisine = entry.cuisine ?? textField(dish, 'cuisine');
  // Optional slots are not counted in the nutrition, as on a shipped dish.
  const counted = dishRaw(
    nb,
    rows.filter((r) => !r.optional),
  );
  const nutrition = ownNutritionView(
    {
      raw: counted.rows,
      unmeasured: [
        ...counted.unmeasured.map((u) => u.name),
        ...counted.unconverted.map((u) => u.name),
        ...counted.skipped.map((s) => s.name),
      ],
      optional: rows
        .filter((r) => r.optional)
        .map((r) => ({ name: r.name, ...(r.totalG === undefined ? {} : { g: r.totalG }) })),
    },
    portions,
    ctx.lookup,
  );
  const own = parts[parts.length - 1];
  return {
    origin: 'own',
    id: dish.id,
    name: dish.name,
    ...(course === undefined ? {} : { course }),
    ...(cuisine === undefined ? {} : { cuisine }),
    ...(entry.meatFree === undefined ? {} : { meatFree: entry.meatFree }),
    ...(dish.note === undefined ? {} : { note: dish.note }),
    characters: withoutMeatFlags(entry.characters),
    portions,
    components: parts.flatMap((p) =>
      p.componentId === undefined ? [] : [{ id: p.componentId, name: p.name, lines: [...p.lines] }],
    ),
    slots: own === undefined ? [] : [...own.lines],
    steps: partSteps(parts, ctx.lang, ctx.known, ctx.learned),
    nutrition,
    fillings: { rows, raw: dishRaw(nb, rows) },
  };
}
