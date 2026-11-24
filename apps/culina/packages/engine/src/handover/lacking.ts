// What a dish lacks, as things to put on the household's shopping list (roadmap goal 11): which
// lines lack is read by `lackingItems` (./reading.ts) from the finder's report of the dish; here
// they become input of the list package. Pure: names and the words of an amount come in as
// functions, so the cook's language and the display rounding are the caller's. This module
// carries the list package's usual items (rule 4); a screen that only counts what lacks reads
// ./reading.ts.
import {
  DEFAULT_PRIORITY,
  OTHER_CATEGORY,
  usualCategory,
  type AddInput,
  type Origin,
} from '@nexumia-de/list';
import type { HouseholdMeasure } from '../amounts/round';
import type { Amount } from '../amounts/types';
import type { ComponentRef } from '../components/types';
import { lackingItems, type LackingReport } from './reading';

export type { LackingReport } from './reading';

export interface LackingOptions {
  /** The name of an ingredient or a component in the cook's language (the kitchen name first). */
  nameOf: (ref: ComponentRef) => string;
  /** An amount as the cook reads it ("200 g", "½ EL"), with the spoon or cup the source wrote. */
  amountText: (amount: Amount, measure?: HouseholdMeasure) => string;
  /** The title of the dish in the list's origin, in the cook's language; default the report's name. */
  title?: string;
  /**
   * What the dish is, the same in every language (`shipped:<id>`, a chosen filling included;
   * `own:<id>`): kept in the origin as `dish`, so that the dish is known again whatever its title.
   */
  dish?: string;
}

export interface LackingLines {
  /** One list input per catalogue ingredient that lacks, in the order of the dish's lines. */
  lines: AddInput[];
  /**
   * Names without a catalogue ingredient: the lines the catalogue lacks and a component that
   * lacks without lines of its own to look at. Not put on the list by themselves; the caller may
   * hand them over as `freeLines`.
   */
  free: string[];
}

const originOf = (title: string, dish: string | undefined): Origin => ({
  kind: 'recipe',
  app: 'culina',
  title,
  ...(dish === undefined ? {} : { dish }),
});

/**
 * The lines a dish lacks as list input: the name in the cook's language, Culina's catalogue id,
 * the amount as the caller writes it (amounts of one ingredient in one unit added up first, other
 * units beside them; none when unknown), Emptio's default priority, a `recipe` origin of Culina
 * with the dish's title and key, and for rule 4 the usual item of the name as the catalogue's
 * category. A sub-component that could not be made gives the lines it lacks.
 */
export function lackingLines(report: LackingReport, options: LackingOptions): LackingLines {
  const title = options.title ?? report.name;
  const { items, free } = lackingItems(report, options.nameOf);
  const lines = items.map(({ ref, amounts }): AddInput => {
    const name = options.nameOf(ref);
    const texts = amounts.map(({ amount, measure }) => options.amountText(amount, measure));
    return {
      name,
      ingredientId: ref.id,
      ...(texts.length === 0 ? {} : { amount: texts.join(' + ') }),
      priority: DEFAULT_PRIORITY,
      origins: [originOf(title, options.dish)],
      catalogue: { ingredientId: ref.id, categoryId: usualCategory(name) ?? OTHER_CATEGORY },
    };
  });
  return { lines, free };
}

/**
 * Free names (`LackingLines.free`) as list input, for when the cook ticks them: no ingredient id,
 * no amount, the same origin as the dish's other lines; the category by rule 4 from the name.
 */
export const freeLines = (
  names: readonly string[],
  options: { title: string; dish?: string },
): AddInput[] =>
  names.map((name) => ({
    name,
    priority: DEFAULT_PRIORITY,
    origins: [originOf(options.title, options.dish)],
  }));
