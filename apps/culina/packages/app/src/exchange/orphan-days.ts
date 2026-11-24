// "The date, no more": a day of cooking without a live dish is a remnant of a deleted dish and is
// dropped, from the export, from a replace and from a merge (docs/data-model.md, Date a dish was
// cooked). Pure: the records come in.
import type { ExportRecord } from '@culina/engine';

/** The family ids of dish records (`version.family`). */
export const dishFamilies = (dishes: readonly ExportRecord[]): Set<string> =>
  new Set(
    dishes.flatMap((d) => {
      const family = (d.version as { family?: unknown } | undefined)?.family;
      return typeof family === 'string' ? [family] : [];
    }),
  );

/** The day records whose dish family is among `families`. */
export const daysOfLiveDishes = (
  cooked: readonly ExportRecord[],
  families: ReadonlySet<string>,
): ExportRecord[] => cooked.filter((c) => typeof c.dish === 'string' && families.has(c.dish));
