// What a shipped dish lacks, as lines for the household's shopping list, in the cook's language
// and written as the dish's page writes the amounts: grams as on the page, a spoon or cup where the
// source wrote one (to the quarter, as on the page), and pieces rounded up to whole ones, since a
// shop sells no half onion. No base-unit figure goes to the list. A spoon-sized amount of a staple
// (salt, flour for dusting) is handed like any other line when it lacks, in the recipe's spoon; the
// cook can leave it unticked once a screen offers the lines. The engine reads what lacks
// (`classicReport`, `lackingLines`); no rule here.
import { classicReport, freeLines, lackingLines, roundMeasure } from '@culina/engine';
import type { Amount, Classic, HouseholdMeasure, Lang, LackingLines } from '@culina/engine';
import type { AddInput } from '@nexumia-de/list';
import { withCatalogue } from '../cook/classic-finder';
import { cookInput, type CookSource } from '../cook/input';
import type { IngredientRecord } from '../records';
import { formatMass, formatNumber } from '../shared/mass';
import { displayName } from '../shared/names';
import { fraction } from '../shared/units';
import { stringsDe, stringsEn } from '../strings';

const unitsOf = (lang: Lang): Record<string, string | undefined> =>
  (lang === 'de' ? stringsDe : stringsEn).units;

/** Whole pieces to buy: up from the exact count, never below one. */
const piecesToBuy = (count: number): number => Math.max(1, Math.ceil(count - 1e-9));

/**
 * An amount for the shopping list in a language: "250 g", "½ EL", "3 Stück", "20 ml". Grams and
 * millilitres as the dish's page shows them, a spoon or cup to the quarter where the source wrote
 * one, pieces up to whole ones ("1 pc", "3 pcs"; "1 Stück"); any other unit as a number with its name.
 */
export const listAmountText = (amount: Amount, lang: Lang, measure?: HouseholdMeasure): string => {
  const units = unitsOf(lang);
  const unit = (id: string): string => units[id] ?? id;
  if (amount.unit === 'g') return formatMass(amount.value, 'g', lang);
  if (amount.unit === 'count') {
    const n = piecesToBuy(amount.value);
    return `${n} ${unit(n === 1 ? 'count-one' : 'count')}`;
  }
  if (amount.unit === 'ml') {
    const shown = measure === undefined ? undefined : roundMeasure(amount.value, measure);
    if (measure !== undefined && shown?.ok === true)
      return `${fraction(shown.value, lang)} ${unit(measure)}`;
    return `${formatNumber(amount.value, amount.value < 10 ? 1 : 0, lang)} ${unit('ml')}`;
  }
  return `${formatNumber(amount.value, 3, lang)} ${unit(amount.unit)}`;
};

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

/**
 * The lines a shipped dish lacks for some portions, as list input, and the names the catalogue
 * lacks (`free`; `freeListLines` makes list input of those the cook ticks). Undefined when the
 * dish cannot be derived.
 */
export const classicListLines = (
  input: ClassicLinesInput,
): (LackingLines & { title: string; dish: string }) | undefined => {
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
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const dish = shippedDishKey(input.classic.id, input.choice);
  const lines = lackingLines(report, {
    nameOf: (ref) => {
      const record = ref.kind === 'ingredient' ? byId.get(ref.id) : undefined;
      return record === undefined ? ref.id : displayName(record, input.lang);
    },
    amountText: (amount, measure) => listAmountText(amount, input.lang, measure),
    title: report.name,
    dish,
  });
  return { ...lines, title: report.name, dish };
};

/** The free names the cook ticked, as list input with the dish's origin. */
export const freeListLines = (
  names: readonly string[],
  dish: { title: string; dish: string },
): AddInput[] => freeLines(names, dish);
