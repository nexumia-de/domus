// The Dishes screen: the list, and the detail of one dish beside it or as its own screen.
import { getDish, listDishes, notebook } from '../demo';
import { strings } from '../strings';
import { dishDetail } from './dish-detail';
import type { ListState } from './entry-list';
import { notebookScreen } from './notebook-screen';

/** The search text survives navigation between the list and the details. */
const state: ListState = { query: '' };

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
        example: strings.dishes.exampleNote,
        guidanceSummary: strings.screens.dishes.guidanceSummary,
        guidance: strings.screens.dishes.guidance,
      },
      detail: (id) => {
        const dish = getDish(id);
        return dish === undefined ? undefined : dishDetail(notebook(), dish);
      },
      unknown: strings.dishes.unknown,
      chooseOne: strings.dishes.chooseOne,
    },
    param,
  );
