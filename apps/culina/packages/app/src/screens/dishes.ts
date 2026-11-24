// The Dishes part of the Notebook: the user's own dishes, for editing and building on, in a plain
// list with the search (notebook-list.ts), and the detail of a dish beside it or as its own
// screen. The shipped dishes are on Cook and only there; "Keep in my notebook" on a shipped dish
// brings it here (docs/decisions/sauces-are-parts.md, which changes the cook-screen decision).
import { dishRows } from '../dishes/list';
import { cookedByFamily, getDish, listDishes, notebook, onCookedChange } from '../notebook';
import type { NotebookRow } from '../shared/notebook-rows';
import { formatDate } from '../shared/locale';
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

const LABELS = {
  course: courseLabel,
  cuisine: cuisineLabel,
  cooked: (date: string) => strings.cook.rowCooked(formatDate(date)),
};

/**
 * The day a dish was cooked changes on the dish page beside the list (from 720 px): the row's quiet
 * line follows at once, without drawing the pane anew, so the list neither jumps nor takes the
 * focus from the dish page's status line.
 */
const followCookedDays = (pane: HTMLElement, rows: NotebookRow[]): void => {
  const stop = onCookedChange(() => {
    if (!pane.isConnected) {
      stop();
      return;
    }
    const fresh = new Map(
      dishRows(listDishes(), LABELS, cookedByFamily()).map((row) => [row.id, row.meta]),
    );
    for (const row of rows) row.meta = fresh.get(row.id) ?? row.meta;
    for (const link of pane.querySelectorAll<HTMLAnchorElement>('a.notebook-row')) {
      const row = rows.find((r) => r.href === link.getAttribute('href'));
      if (row === undefined) continue;
      let meta = link.querySelector('.entry-meta');
      if (row.meta === '') {
        meta?.remove();
        continue;
      }
      if (meta === null) {
        meta = el('span', 'entry-meta');
        link.append(meta);
      }
      meta.textContent = row.meta;
    }
  });
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
      pane: (options) => {
        const rows = dishRows(listDishes(), LABELS, cookedByFamily());
        const pane = notebookList(
          'dishes-pane',
          rows,
          state,
          text(),
          options,
          // "Back to the list" on the dish then returns here, also from a shipped dish.
          (row) => noteOpenedFromList('dishes', row.href),
        );
        followCookedDays(pane, rows);
        return pane;
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
