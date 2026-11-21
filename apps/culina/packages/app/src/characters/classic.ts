// The facts of a shipped dish for the character rules: every ingredient line of its components
// and slots with its mass where the source gives an amount that converts (`conversionOf`), the
// techniques of its steps and its course. A line whose ingredient the catalogue lacks is a line
// without class and mass.
import { deriveClassic, toGrams } from '@culina/engine';
import type { CharacterFacts, CharacterLine, Classic } from '@culina/engine';
import { catalogueBelow } from './below';
import { conversionOf, lineOf } from './classes';
import type { Below, Lookup } from './classes';

/**
 * The facts of one classic; `undefined` when the engine cannot derive it.
 *
 * @param below - The foods below a group; by default those of the loaded catalogue.
 */
export const factsOfClassic = (
  classic: Classic,
  lookup: Lookup,
  below: Below = catalogueBelow,
): CharacterFacts | undefined => {
  const derived = deriveClassic(classic, { lang: 'en' });
  if (!derived.ok) return undefined;
  const lines: CharacterLine[] = [];
  const all = [...derived.components.flatMap((c) => c.lines), ...derived.dish.slots];
  for (const line of all) {
    if (line.ref?.kind === 'component') continue;
    if (line.ref === undefined) {
      lines.push({ classes: [] });
      continue;
    }
    const id = line.ref.id;
    const grams =
      line.amount === undefined ? undefined : toGrams(line.amount, conversionOf(id, lookup, below));
    lines.push(lineOf(id, grams?.ok === true ? grams.g : undefined, lookup, below));
  }
  const steps = (classic.components ?? []).flatMap((c) => c.steps ?? []);
  return {
    lines,
    techniques: [
      ...new Set(steps.flatMap((s) => (s.technique === undefined ? [] : [s.technique]))),
    ],
    stepsKnown: steps.some((s) => s.technique !== undefined || s.action !== undefined),
    course: classic.course,
  };
};
