// The categories of a list: the starting ones (data of the app) with what the
// household changed on top (docs/data-model.md#category).
import { STARTING_CATEGORIES, categoryOrder, type CategoryChange } from '@emptio/engine';
import { OTHER_CATEGORY } from '@nexumia-de/list';

export interface Category {
  id: string;
  name: string;
  /** A starting category; it can be renamed and hidden, not removed. */
  starting: boolean;
  hidden: boolean;
  /** The household gave it a name of its own. */
  renamed: boolean;
}

const startingIds = STARTING_CATEGORIES.map((category) => category.id);

/** Every category, shown or hidden, in the order of the list; hidden ones last. */
export function categoriesOf(
  changes: readonly CategoryChange[],
  lang: 'en' | 'de',
  unnamed: string,
): Category[] {
  const change = new Map(changes.map((c) => [c.id, c]));
  const byId = new Map<string, Category>();
  for (const starting of STARTING_CATEGORIES) {
    const own = change.get(starting.id);
    byId.set(starting.id, {
      id: starting.id,
      name: own?.name ?? starting[lang],
      starting: true,
      hidden: own?.hidden === true && starting.id !== OTHER_CATEGORY,
      renamed: own?.name !== undefined,
    });
  }
  for (const own of changes) {
    if (byId.has(own.id)) continue;
    byId.set(own.id, {
      id: own.id,
      name: own.name ?? unnamed,
      starting: false,
      hidden: own.hidden === true,
      renamed: true,
    });
  }
  const shown = categoryOrder(startingIds, changes);
  const out: Category[] = [];
  for (const id of shown) {
    const category = byId.get(id);
    if (category) out.push(category);
  }
  for (const category of byId.values()) if (!shown.includes(category.id)) out.push(category);
  return out;
}

/** The ids in the order rule 1 takes. */
export const orderOf = (changes: readonly CategoryChange[]): string[] =>
  categoryOrder(startingIds, changes);
