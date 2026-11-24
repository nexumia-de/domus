// The rows of the Notebook's Dishes: the user's own dishes in one plain list
// (shared/notebook-rows.ts searches them). The shipped dishes are on Cook, not here
// (docs/decisions/sauces-are-parts.md). Pure: no DOM; the words for a course and a cuisine come in.
import type { DishRecord } from '../records';
import { hashFor } from '../router';
import type { NotebookRow } from '../shared/notebook-rows';

export interface DishLabels {
  course(course: string): string;
  cuisine(cuisine: string): string;
  /** "cooked 3 Nov 2026" for the kept day, `YYYY-MM-DD` in. */
  cooked?(date: string): string;
}

const metaOf = (
  labels: DishLabels,
  course: string | undefined,
  cuisine: string | undefined,
  cooked: string | undefined,
): string =>
  [
    course === undefined ? undefined : labels.course(course),
    cuisine === undefined ? undefined : labels.cuisine(cuisine),
    cooked === undefined || labels.cooked === undefined ? undefined : labels.cooked(cooked),
  ]
    .filter((part): part is string => part !== undefined)
    .join(' · ');

/**
 * A row per dish of the notebook, in its order; the muted line holds course, cuisine and the day
 * the dish was last cooked, where one is kept (`cooked`: by family, docs/data-model.md).
 */
export const dishRows = (
  own: readonly DishRecord[],
  labels: DishLabels,
  cooked: ReadonlyMap<string, string> = new Map(),
): NotebookRow[] =>
  own.map((d): NotebookRow => ({
    origin: 'own',
    id: d.id,
    name: d.name,
    meta: metaOf(labels, d.course, d.cuisine, cooked.get(d.version.family)),
    href: hashFor('dishes', d.id),
  }));
