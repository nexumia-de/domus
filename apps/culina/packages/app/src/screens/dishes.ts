// The Dishes part of the Notebook: the user's own dishes and the shipped ones, for editing and
// building on, in one plain list with the search and the origin choice (notebook-list.ts, as
// Components), and the detail of an own dish beside it or as its own screen. A shipped row opens
// the shipped dish's own screen (#/classic/<id>), read-only with Keep in my notebook. It is no
// second list to browse: the dish filter, "Only with what I have" and "Use up first" are Cook's
// (docs/decisions/cook-screen.md).
import { classics } from '../classics/content';
import { currentLang } from '../classics/lang';
import { dishRows } from '../dishes/list';
import { getDish, listDishes, notebook } from '../notebook';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { strings } from '../strings';
import { courseLabel, cuisineLabel } from './dish-filter';
import { notebookExtras } from './notebook-extras';
import { dishDetail } from './dish-detail';
import { noteOpenedFromList } from './list-return';
import { notebookList, type NotebookListState, type NotebookListText } from './notebook-list';
import { notebookScreen } from './notebook-screen';

/** The search text and the origin choice survive navigation between the list and the details. */
const state: NotebookListState = { query: '' };

/** The list's actions: a new dish, and a dish put together by chance (not while the store is closed). */
const extras = (): ReturnType<typeof notebookExtras> => {
  const base = notebookExtras('dishes');
  if (base.actions.length === 0) return base;
  const random = el('a', 'btn quiet random-link', strings.dishes.pickLink);
  random.href = hashFor('dishes', undefined, 'random');
  return { ...base, actions: [...base.actions, random] };
};

const text = (): NotebookListText => ({
  title: strings.screens.dishes.title,
  searchLabel: strings.notebook.searchLabel,
  listLabel: strings.dishes.listLabel,
  empty: strings.screens.dishes.empty,
  emptyNotebook: strings.empty.dishes,
  guidanceSummary: strings.screens.dishes.guidanceSummary,
  guidance: strings.screens.dishes.guidance,
  originAny: strings.browse.originAny,
});

export const dishesScreen = (param?: string): HTMLElement =>
  notebookScreen(
    {
      route: 'dishes',
      pane: (options) =>
        notebookList(
          'dishes-pane',
          dishRows(listDishes(), classics(), currentLang(), {
            course: courseLabel,
            cuisine: cuisineLabel,
          }),
          state,
          text(),
          options,
          // "Back to the list" on the dish then returns here, also from a shipped dish.
          (row) => noteOpenedFromList('dishes', row.href),
        ),
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
