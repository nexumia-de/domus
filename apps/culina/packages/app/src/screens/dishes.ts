// The Dishes part of the Notebook: the user's own dishes, for editing and building on, as a plain
// list by name with the search (entry-list.ts, as Components), and the detail of a dish beside it
// or as its own screen. It is no second list to browse: every dish, own and shipped, under the one
// filter is Cook (docs/decisions/cook-screen.md). A shipped dish opens its own screen
// (#/classic/<id>) from Cook.
import { getDish, listDishes, notebook } from '../notebook';
import type { DishRecord } from '../records';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { strings } from '../strings';
import { courseLabel, cuisineLabel } from './dish-filter';
import { notebookExtras } from './notebook-extras';
import { dishDetail } from './dish-detail';
import type { ListState } from './entry-list';
import { notebookScreen } from './notebook-screen';

/** The search text survives navigation between the list and the details. */
const state: ListState = { query: '' };

/** The list's actions: a new dish, and a dish put together by chance (not while the store is closed). */
const extras = (): ReturnType<typeof notebookExtras> => {
  const base = notebookExtras('dishes');
  if (base.actions.length === 0) return base;
  const random = el('a', 'btn quiet random-link', strings.dishes.pickLink);
  random.href = hashFor('dishes', undefined, 'random');
  return { ...base, actions: [...base.actions, random] };
};

/** The quiet line under a dish: its course and cuisine, where they are set. */
const metaOf = (dish: DishRecord): string =>
  [
    ...(dish.course === undefined ? [] : [courseLabel(dish.course)]),
    ...(dish.cuisine === undefined ? [] : [cuisineLabel(dish.cuisine)]),
  ].join(' · ');

export const dishesScreen = (param?: string): HTMLElement =>
  notebookScreen(
    {
      route: 'dishes',
      entries: listDishes().map((d) => ({ id: d.id, name: d.name, meta: metaOf(d) })),
      state,
      text: {
        title: strings.screens.dishes.title,
        searchLabel: strings.notebook.searchLabel,
        listLabel: strings.dishes.listLabel,
        empty: strings.screens.dishes.empty,
        emptyNotebook: strings.empty.dishes,
        guidanceSummary: strings.screens.dishes.guidanceSummary,
        guidance: strings.screens.dishes.guidance,
      },
      detail: (id) => {
        const dish = getDish(id);
        return dish === undefined ? undefined : dishDetail(notebook(), dish);
      },
      unknown: strings.dishes.unknown,
      chooseOne: strings.dishes.chooseOne,
      extras: extras(),
    },
    param,
  );
