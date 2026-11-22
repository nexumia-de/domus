// The rows of the Notebook's Dishes: the user's own dishes, then the shipped ones by name, in one
// plain list (shared/notebook-rows.ts groups and searches them). A shipped row opens the shipped
// dish's own screen (#/classic/<id>), read-only with Keep in my notebook. Pure: no DOM; the words
// for a course and a cuisine come in.
import { pickText } from '@culina/engine';
import type { Classic, Lang } from '@culina/engine';
import type { DishRecord } from '../records';
import { hashFor } from '../router';
import type { NotebookRow } from '../shared/notebook-rows';
import { strings } from '../strings';

export interface DishLabels {
  course(course: string): string;
  cuisine(cuisine: string): string;
}

const metaOf = (
  labels: DishLabels,
  course: string | undefined,
  cuisine: string | undefined,
  shipped: boolean,
): string =>
  [
    course === undefined ? undefined : labels.course(course),
    cuisine === undefined ? undefined : labels.cuisine(cuisine),
    shipped ? strings.browse.rowOrigin.shipped : undefined,
  ]
    .filter((part): part is string => part !== undefined)
    .join(' · ');

/**
 * Every row: the notebook's dishes in their order, then the shipped ones sorted by name; the
 * muted line holds course and cuisine, and "Shipped" on a shipped one.
 */
export const dishRows = (
  own: readonly DishRecord[],
  shipped: readonly Classic[],
  lang: Lang,
  labels: DishLabels,
): NotebookRow[] => {
  const collator = new Intl.Collator(lang);
  return [
    ...own.map((d): NotebookRow => ({
      origin: 'own',
      id: d.id,
      name: d.name,
      meta: metaOf(labels, d.course, d.cuisine, false),
      href: hashFor('dishes', d.id),
    })),
    ...shipped
      .map((c): NotebookRow => ({
        origin: 'shipped',
        id: c.id,
        name: pickText(c.name, lang),
        meta: metaOf(labels, c.course, c.country, true),
        href: hashFor('classic', c.id),
      }))
      .sort((a, b) => collator.compare(a.name, b.name)),
  ];
};
