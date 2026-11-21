// Which characters a dish has, by the rules of a table. Pure: the facts and the rules come in,
// nothing is read from elsewhere. A share by mass is judged only where enough of the dish is
// measured; where it is not, a rule falls back to presence or says nothing, as the rule states.
import type {
  CharacterClause,
  CharacterCoverage,
  CharacterFacts,
  CharacterLine,
  CharacterReason,
  CharacterRule,
  CharactersResult,
  FigureBound,
} from './types';

/** Shares are judged when at least this part of the lines has a mass. */
export const MIN_MEASURED = 0.5;
/**
 * Fat and energy per 100 g are judged when at least this part of the lines has a mass: a figure
 * of the whole dish is wrong as soon as a main ingredient is left out, a share only less exact.
 */
export const MIN_MEASURED_FIGURES = 0.8;

const clean = (n: number): number => Number(n.toPrecision(12));

const usable = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

const coverageOf = (lines: readonly CharacterLine[]): CharacterCoverage => {
  const measured = lines.filter((l) => usable(l.g)).length;
  return {
    lines: lines.length,
    measured,
    covered: lines.length > 0 && measured / lines.length >= MIN_MEASURED,
  };
};

const isOf = (line: CharacterLine, classes: readonly string[]): boolean =>
  line.classes.some((c) => classes.includes(c));

/**
 * The share by mass of the lines of some classes.
 *
 * @returns The share of the measured mass, or `undefined` when it cannot be known: the dish is
 * not covered, or a line of these classes has no mass.
 */
export const shareOf = (
  facts: CharacterFacts,
  classes: readonly string[],
  coverage: CharacterCoverage = coverageOf(facts.lines),
): number | undefined => {
  if (!coverage.covered) return undefined;
  const mine = facts.lines.filter((l) => isOf(l, classes));
  if (mine.some((l) => !usable(l.g))) return undefined;
  const total = facts.lines.reduce((sum, l) => sum + (usable(l.g) ? l.g : 0), 0);
  if (total === 0) return undefined;
  return clean(mine.reduce((sum, l) => sum + (l.g ?? 0), 0) / total);
};

/** A figure per 100 g of the measured mass; `undefined` when a measured line lacks the figure. */
const figureOf = (
  facts: CharacterFacts,
  key: 'fatPer100g' | 'kcalPer100g',
  coverage: CharacterCoverage,
): number | undefined => {
  if (coverage.lines === 0 || coverage.measured / coverage.lines < MIN_MEASURED_FIGURES) {
    return undefined;
  }
  let total = 0;
  let sum = 0;
  for (const line of facts.lines) {
    if (!usable(line.g)) continue;
    const per100 = line[key];
    if (per100 === undefined || !Number.isFinite(per100) || per100 < 0) return undefined;
    total += line.g;
    sum += (per100 * line.g) / 100;
  }
  return total === 0 ? undefined : clean((sum / total) * 100);
};

const within = (value: number | undefined, bound: FigureBound): boolean =>
  value !== undefined &&
  (bound.min === undefined || value >= bound.min) &&
  (bound.max === undefined || value <= bound.max);

/** Whether the clause holds, and by what; a clause without any condition never holds. */
const holds = (
  clause: CharacterClause,
  facts: CharacterFacts,
  coverage: CharacterCoverage,
  index: number,
): CharacterReason | undefined => {
  let reason: CharacterReason | undefined;
  if (clause.ingredients !== undefined) {
    if (!facts.lines.some((l) => isOf(l, clause.ingredients ?? []))) return undefined;
    reason = { clause: index, by: 'presence' };
    if (clause.minShare !== undefined) {
      const share = shareOf(facts, clause.ingredients, coverage);
      if (share === undefined) {
        if (clause.presence === false) return undefined;
      } else if (share < clause.minShare) return undefined;
      else reason = { clause: index, by: 'share', share };
    }
  }
  if (clause.alsoIngredients !== undefined) {
    for (const classes of clause.alsoIngredients) {
      if (!facts.lines.some((l) => isOf(l, classes))) return undefined;
    }
    reason ??= { clause: index, by: 'presence' };
  }
  if (clause.techniques !== undefined) {
    if (!clause.techniques.some((t) => facts.techniques.includes(t))) return undefined;
    reason ??= { clause: index, by: 'technique' };
  }
  if (clause.withoutTechniques !== undefined) {
    if (!facts.stepsKnown) return undefined;
    if (clause.withoutTechniques.some((t) => facts.techniques.includes(t))) return undefined;
    reason ??= { clause: index, by: 'technique' };
  }
  if (clause.courses !== undefined) {
    if (facts.course === undefined || !clause.courses.includes(facts.course)) return undefined;
    reason ??= { clause: index, by: 'course' };
  }
  for (const [bound, key] of [
    [clause.fat, 'fatPer100g'],
    [clause.kcal, 'kcalPer100g'],
  ] as const) {
    if (bound === undefined) continue;
    if (!within(figureOf(facts, key, coverage), bound)) return undefined;
    reason ??= { clause: index, by: 'figures' };
  }
  return reason;
};

/**
 * The characters of a dish, in the order of the table.
 *
 * A rule gives its character when one of its `when` clauses holds and none of its `unless`
 * clauses does; the reason is the first clause that held.
 *
 * @param facts - The dish's ingredient lines and techniques.
 * @param rules - The character table.
 * @returns The characters with their reasons and how much of the dish was measured.
 */
export function dishCharacters(
  facts: CharacterFacts,
  rules: readonly CharacterRule[],
): CharactersResult {
  const coverage = coverageOf(facts.lines);
  const characters = [];
  for (const rule of rules) {
    let reason: CharacterReason | undefined;
    for (const [i, clause] of rule.when.entries()) {
      reason = holds(clause, facts, coverage, i);
      if (reason !== undefined) break;
    }
    if (reason === undefined) continue;
    if ((rule.unless ?? []).some((c, i) => holds(c, facts, coverage, i) !== undefined)) continue;
    characters.push({ id: rule.id, reason });
  }
  return { characters, coverage };
}
