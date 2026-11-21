// The facts of a shipped dish for the character rules: every ingredient line of its components
// and slots with its mass where the source gives an amount that converts, and the techniques of
// its steps. A line whose ingredient the catalogue lacks is a line without class and mass.
import { deriveClassic, toGrams } from '@culina/engine';
import type { CharacterFacts, CharacterLine, Classic } from '@culina/engine';
import { lineOf } from './classes';
import type { Lookup } from './classes';

/** The facts of one classic; `undefined` when the engine cannot derive it. */
export const factsOfClassic = (classic: Classic, lookup: Lookup): CharacterFacts | undefined => {
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
    const record = lookup(id);
    const grams =
      line.amount === undefined
        ? undefined
        : toGrams(line.amount, {
            ...(record?.densityGPerMl === undefined
              ? {}
              : { densityGPerMl: record.densityGPerMl.value }),
            ...(record?.unitWeightG === undefined ? {} : { unitWeightG: record.unitWeightG.value }),
          });
    lines.push(lineOf(id, grams?.ok === true ? grams.g : undefined, lookup));
  }
  const steps = (classic.components ?? []).flatMap((c) => c.steps ?? []);
  return {
    lines,
    techniques: [
      ...new Set(steps.flatMap((s) => (s.technique === undefined ? [] : [s.technique]))),
    ],
    stepsKnown: steps.some((s) => s.technique !== undefined || s.action !== undefined),
  };
};
