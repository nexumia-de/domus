// The Dishes screen: the list, and the detail of one dish beside it or as its own screen.
import { getDish, listDishes, notebook } from '../notebook';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { strings } from '../strings';
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

export const dishesScreen = (param?: string): HTMLElement =>
  notebookScreen(
    {
      route: 'dishes',
      entries: listDishes().map((d) => ({
        id: d.id,
        name: d.name,
        meta: `${strings.dishes.portionCount(d.portions ?? 1)} · ${strings.dishes.slotCount(d.slots.length)}`,
      })),
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
