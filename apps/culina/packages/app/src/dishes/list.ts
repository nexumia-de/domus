// The rows of the Notebook's Dishes: the user's own dishes in one plain list
// (shared/notebook-rows.ts searches them). The shipped dishes are on Cook, not here
// (docs/decisions/sauces-are-parts.md). Pure: no DOM; the words for a course and a cuisine come in.
import type { DishRecord } from '../records';
import { hashFor } from '../router';
import type { NotebookRow } from '../shared/notebook-rows';

export interface DishLabels {
  course(course: string): string;
  cuisine(cuisine: string): string;
}

const metaOf = (
  labels: DishLabels,
  course: string | undefined,
  cuisine: string | undefined,
): string =>
  [
    course === undefined ? undefined : labels.course(course),
    cuisine === undefined ? undefined : labels.cuisine(cuisine),
  ]
    .filter((part): part is string => part !== undefined)
    .join(' · ');

/** A row per dish of the notebook, in its order; the muted line holds course and cuisine. */
export const dishRows = (own: readonly DishRecord[], labels: DishLabels): NotebookRow[] =>
  own.map((d): NotebookRow => ({
    origin: 'own',
    id: d.id,
    name: d.name,
    meta: metaOf(labels, d.course, d.cuisine),
    href: hashFor('dishes', d.id),
  }));
