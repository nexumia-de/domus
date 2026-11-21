// The Dishes screen: every dish, the notebook's and the shipped ones, in one list under the one
// filter (dish-list.ts), and the detail of an own dish beside it or as its own screen. A shipped
// dish opens its own screen (#/classic/<id>).
import { getDish, listDishes, notebook } from '../notebook';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { strings } from '../strings';
import { notebookExtras } from './notebook-extras';
import { dishDetail } from './dish-detail';
import { dishList } from './dish-list';
import { paneGuidance, paneHead, type ListText, type PaneOptions } from './entry-list';
import { notebookScreen } from './notebook-screen';

/** The list's actions: a new dish, and a dish put together by chance (not while the store is closed). */
const extras = (): ReturnType<typeof notebookExtras> => {
  const base = notebookExtras('dishes');
  if (base.actions.length === 0) return base;
  const random = el('a', 'btn quiet random-link', strings.dishes.pickLink);
  random.href = hashFor('dishes', undefined, 'random');
  return { ...base, actions: [...base.actions, random] };
};

const text = (): ListText => ({
  title: strings.screens.dishes.title,
  searchLabel: strings.notebook.searchLabel,
  listLabel: strings.dishes.listLabel,
  empty: strings.browse.none,
  emptyNotebook: strings.empty.dishes,
  guidanceSummary: strings.screens.dishes.guidanceSummary,
  guidance: strings.screens.dishes.guidance,
});

/** The list pane: the head, the one list, and the example data while the notebook has no dish. */
const pane = (options: PaneOptions): HTMLElement => {
  const t = text();
  const section = el('section', 'entry-list split-list dishes-pane');
  paneHead(section, t, options);
  // With no dish of its own the notebook offers its example data under the list; that note then
  // also stands for a list with no dish at all.
  const ownEmpty = listDishes().length === 0 && (options.emptyActions ?? []).length > 0;
  section.append(
    dishList({
      listLabel: t.listLabel,
      empty: ownEmpty ? [] : [el('p', 'empty', t.emptyNotebook)],
      ...(options.current === undefined ? {} : { current: options.current }),
    }),
  );
  if (ownEmpty) {
    const own = el('div', 'dishes-own-empty');
    own.append(el('p', 'note-quiet', t.emptyNotebook), ...(options.emptyActions ?? []));
    section.append(own);
  }
  section.append(paneGuidance(t));
  return section;
};

export const dishesScreen = (param?: string): HTMLElement =>
  notebookScreen(
    {
      route: 'dishes',
      pane,
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
