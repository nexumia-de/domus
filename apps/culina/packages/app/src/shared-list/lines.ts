// What a shipped dish lacks, as lines for the household's shopping list, in the cook's language
// and written as the dish's page writes the amounts: grams as on the page, a spoon or cup where the
// source wrote one (to the quarter, as on the page), and pieces rounded up to whole ones, since a
// shop sells no half onion. No base-unit figure goes to the list. A spoon-sized amount of a staple
// (salt, flour for dusting) is handed like any other line when it lacks, in the recipe's spoon; the
// cook can leave it unticked in the confirmation. The engine reads what lacks (./report.ts,
// `lackingLines`); no rule here. `classicListLines` reaches the list package's usual items: the
// dish page uses only `listAmountText` from here, and the bundler leaves the rest out of main.js
// (test/build.test.ts); the confirmation (hand-over.js) calls `lackingLines` itself.
import { freeLines, lackingLines, roundMeasure, type LackingLines } from '@culina/engine';
import type { Amount, HouseholdMeasure, Lang } from '@culina/engine';
import type { AddInput } from '@nexumia-de/list';
import { formatMass, formatNumber } from '../shared/mass';
import { classicLack, lineName, shippedDishKey, type ClassicLinesInput } from './report';
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

/**
 * The lines a shipped dish lacks for some portions, as list input, and the names the catalogue
 * lacks (`free`; `freeListLines` makes list input of those the cook ticks). Undefined when the
 * dish cannot be derived.
 */
export const classicListLines = (
  input: ClassicLinesInput,
): (LackingLines & { title: string; dish: string }) | undefined => {
  const found = classicLack(input);
  if (found === undefined) return undefined;
  const { report } = found;
  const dish = shippedDishKey(input.classic.id, input.choice);
  const lines = lackingLines(report, {
    nameOf: lineName(found.byId, input.lang),
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

export { shippedDishKey, type ClassicLinesInput } from './report';
