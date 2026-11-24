// What a shipped dish lacks against the stock, read without the shopping list's rules and data:
// the finder's report of the dish (`classicReport`) and the lines that lack (`lackingItems`). The
// dish page's offer counts from here, so main.js carries neither the list package's usual items
// nor the write (they are in the hand-over chunk, ../screens/hand-over/confirm.ts, loaded when
// the cook opens the confirmation; test/build.test.ts). No rule here.
import { classicReport, lackingItems } from '@culina/engine';
import type { Amount, Classic, ClassicReportResult, HouseholdMeasure, Lang } from '@culina/engine';
import { withCatalogue } from '../cook/classic-finder';
import { cookInput, type CookSource } from '../cook/input';
import type { IngredientRecord } from '../records';
import { displayName } from '../shared/names';

export interface ClassicLinesInput {
  /** The dish as it is cooked: a frame with the cook's filling (`asChosen`). */
  classic: Classic;
  portions: number;
  lang: Lang;
  /** The notebook and the stock, as the finder reads them. */
  source: CookSource;
  catalogue: ReadonlyMap<string, IngredientRecord>;
  today: string;
  /** The cook's choice of filling (`choiceKey`), part of the dish's key; empty for none. */
  choice?: string;
}

/** The key of a shipped dish in the list's origin: its id, and the filling where one was chosen. */
export const shippedDishKey = (id: string, choice = ''): string =>
  choice === '' ? `shipped:${id}` : `shipped:${id}#${choice}`;

export interface ClassicLack {
  report: Extract<ClassicReportResult, { ok: true }>;
  /** The notebook's and the catalogue's ingredients by id: the names of the lines. */
  byId: ReadonlyMap<string, IngredientRecord>;
}

/** The finder's report of a shipped dish for some portions; undefined when it cannot be made. */
export const classicLack = (input: ClassicLinesInput): ClassicLack | undefined => {
  const ingredients = withCatalogue(input.source.ingredients, input.catalogue);
  const base = cookInput({ ...input.source, ingredients }, input.today);
  const report = classicReport({
    ingredients: base.ingredients,
    stock: base.stock,
    today: base.today,
    ...(base.facts === undefined ? {} : { facts: base.facts }),
    ...(base.substitutes === undefined ? {} : { substitutes: base.substitutes }),
    ...(base.parts === undefined ? {} : { parts: base.parts }),
    classic: input.classic,
    portions: input.portions,
    lang: input.lang,
  });
  if (!report.ok) return undefined;
  return { report, byId: new Map(ingredients.map((i) => [i.id, i])) };
};

/** The name of a line's ingredient or component in the cook's language (the kitchen name first). */
export const lineName =
  (byId: ReadonlyMap<string, IngredientRecord>, lang: Lang) =>
  (ref: { kind: string; id: string }): string => {
    const record = ref.kind === 'ingredient' ? byId.get(ref.id) : undefined;
    return record === undefined ? ref.id : displayName(record, lang);
  };

/**
 * How many catalogue ingredients a shipped dish lacks for some portions: the lines the offer
 * counts and the hand-over writes (`classicListLines` makes one line per item). Free names (not
 * in the catalogue) are not counted: they lack whatever the stock holds. Undefined when the dish
 * cannot be judged.
 */
export const lackingCount = (input: ClassicLinesInput): number | undefined =>
  lackingIds(input)?.length;

/** The catalogue ids of the ingredients a shipped dish lacks (`lackingCount` counts them). */
export const lackingIds = (input: ClassicLinesInput): string[] | undefined =>
  lackingAmounts(input, () => '')?.map((l) => l.id);

/**
 * The ingredients a shipped dish lacks with the amount the list would get, written as
 * `lackingLines` writes it (amounts in several units joined by " + "; "" for none).
 */
export const lackingAmounts = (
  input: ClassicLinesInput,
  amountText: (amount: Amount, measure?: HouseholdMeasure) => string,
): { id: string; amount: string }[] | undefined => {
  const found = classicLack(input);
  if (found === undefined) return undefined;
  return lackingItems(found.report, lineName(found.byId, input.lang)).items.map((i) => ({
    id: i.ref.id,
    amount: i.amounts.map((a) => amountText(a.amount, a.measure)).join(' + '),
  }));
};
