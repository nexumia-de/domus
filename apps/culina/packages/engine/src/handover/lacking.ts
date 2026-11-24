// What a dish lacks, as things to put on the household's shopping list (roadmap goal 11): read
// from the finder's report of the dish (`dishReport`, `classicReport`), never judged again. A
// line lacks when it is `missing` or `short`; a line that is there by substitution, through a
// group or a whole, an optional line and the kitchen's water do not (water always reports
// `have`). Pure: names and the words of an amount come in as functions, so the cook's language
// and the display rounding are the caller's.
import {
  DEFAULT_PRIORITY,
  OTHER_CATEGORY,
  usualCategory,
  type AddInput,
  type Origin,
} from '@nexumia-de/list';
import type { HouseholdMeasure } from '../amounts/round';
import type { Amount, UnitId } from '../amounts/types';
import type { ComponentRef } from '../components/types';
import type { MakeableLineReport } from '../makeable/types';

/** The finder's report of one dish: its name and a report per line. */
export interface LackingReport {
  name: string;
  lines: readonly MakeableLineReport[];
  /** The names of lines without a catalogue ingredient (a classic's `wanted` lines). */
  notInCatalogue?: readonly string[];
  /** Per top-level line (by `index`), the spoon or cup the source wrote (`classicReport`). */
  measures?: readonly (HouseholdMeasure | undefined)[];
}

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

/** The amount to buy: for `missing` the need, for `short` the need less what is there. */
function lackingAmount(line: MakeableLineReport): Amount | undefined {
  const need = line.need;
  if (need === undefined) return undefined;
  if (line.status === 'missing') return need;
  if (line.have === undefined || line.have.unit !== need.unit) return undefined;
  return { value: need.value - line.have.value, unit: need.unit };
}

const lacks = (line: MakeableLineReport): boolean =>
  !line.optional && (line.status === 'missing' || line.status === 'short');

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
  const byId = new Map<
    string,
    { ref: ComponentRef; amounts: Map<UnitId, { value: number; measure?: HouseholdMeasure }> }
  >();
  const free: string[] = [...(report.notInCatalogue ?? [])];
  const walk = (lines: readonly MakeableLineReport[], top: boolean): void => {
    for (const line of lines) {
      if (!lacks(line)) continue;
      if (line.parts !== undefined && line.parts.length > 0) {
        walk(line.parts, false);
        continue;
      }
      const ref = line.ref;
      if (ref === undefined) continue;
      if (ref.kind !== 'ingredient') {
        free.push(options.nameOf(ref));
        continue;
      }
      const known = byId.get(ref.id) ?? { ref, amounts: new Map() };
      const amount = lackingAmount(line);
      if (amount !== undefined) {
        const was = known.amounts.get(amount.unit);
        const measure = was?.measure ?? (top ? report.measures?.[line.index] : undefined);
        known.amounts.set(amount.unit, {
          value: (was?.value ?? 0) + amount.value,
          ...(measure === undefined ? {} : { measure }),
        });
      }
      byId.set(ref.id, known);
    }
  };
  walk(report.lines, true);
  const lines = [...byId.values()].map(({ ref, amounts }): AddInput => {
    const name = options.nameOf(ref);
    const texts = [...amounts].map(([unit, { value, measure }]) =>
      options.amountText({ value, unit }, measure),
    );
    return {
      name,
      ingredientId: ref.id,
      ...(texts.length === 0 ? {} : { amount: texts.join(' + ') }),
      priority: DEFAULT_PRIORITY,
      origins: [originOf(title, options.dish)],
      catalogue: { ingredientId: ref.id, categoryId: usualCategory(name) ?? OTHER_CATEGORY },
    };
  });
  return { lines, free: [...new Set(free)] };
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
