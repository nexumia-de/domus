// The one list of every dish, the notebook's and the shipped ones, as Cook shows it
// (docs/decisions/cook-screen.md): the search, "Only with what I have" and the order (by name or
// "Use up first", kept under `culina.cookList`), the shared filter controls (dish-filter.ts) folded
// behind a summary line of the active choices, a count line and one row per dish. The filter is the
// one kept choice (`currentDishFilter`/`keepDishFilter` in browse/filter.ts), shared with the random
// pick; the search text lives as long as the page. Which dishes the stock covers and the order of
// "Use up first" are the finder's (src/dishes/); the order and the meta are in browse/list-view.ts.
import { dishEntries } from '../browse/entries';
import type { DishEntry } from '../browse/entry';
import {
  COURSE_ORDER,
  currentDishFilter,
  EMPTY_FILTER,
  keepDishFilter,
  offeredBy,
  type DishFilter,
} from '../browse/filter';
import {
  activeChoices,
  dishListView,
  type ActiveChoice,
  type CookNarrowing,
  type ListRow,
} from '../browse/list-view';
import { CHARACTER_TABLE } from '../characters/table';
import { characterLabel } from '../characters/view';
import { currentLang } from '../classics/lang';
import { COUNTRIES } from '../classics/list-view';
import { loadNames } from '../classics/names';
import { notebookSource } from '../cook/source';
import { readyNowKeys } from '../dishes/ready-now';
import { useUpNow, type UseUpNow } from '../dishes/use-up-order';
import { browserStore, readCookList, writeCookList, type CookList } from '../prefs';
import { el } from '../shell/el';
import { strings } from '../strings';
import {
  courseLabel,
  cuisineLabel,
  dishFilterControls,
  replaceFilterControls,
  tick,
} from './dish-filter';
import { nothingTicked } from './cook/empty';
import { nextId } from './fields';
import { noteOpenedFromList, type ListScreen } from './list-return';

/** The search text, until the page is closed. */
const search = { query: '' };

/** Whether the filter is unfolded; it stays so until the page closes. */
let unfolded = false;

/**
 * True once the catalogue has been read (or could not be): before that, a dish's characters and
 * whether it is without meat are not all known, and the list does not say that nothing fits.
 */
let namesRead = false;

/** Every dish as an entry, in the content language (cached: browse/entries.ts). */
export const everyEntry = (): readonly DishEntry[] => dishEntries();

const ORDER = {
  characters: CHARACTER_TABLE.map((c) => c.id),
  courses: COURSE_ORDER,
  cuisines: COUNTRIES,
};

const metaText = ({ meta }: ListRow, useUp: UseUpNow | undefined): string =>
  [
    meta.course === undefined ? undefined : courseLabel(meta.course),
    meta.cuisine === undefined ? undefined : cuisineLabel(meta.cuisine),
    meta.origin === undefined ? undefined : strings.browse.rowOrigin[meta.origin],
    meta.useUp === undefined || useUp === undefined
      ? undefined
      : strings.cook.reasonUses(useUp.itemName(meta.useUp.itemId), meta.useUp.daysLeft),
  ]
    .filter((part) => part !== undefined)
    .join(' · ');

const choiceLabel = (choice: ActiveChoice): string => {
  const t = strings.browse;
  switch (choice.kind) {
    case 'origin':
      return t.origin[choice.value];
    case 'character':
      return characterLabel(choice.value, currentLang());
    case 'course':
      return courseLabel(choice.value);
    case 'cuisine':
      return cuisineLabel(choice.value);
    case 'meatFree':
      return t.meatFree;
    case 'completeOnly':
      return t.completeOnly;
  }
};

/** The summary of the folded filter: what it is, then the active choices or "Everything". */
const summaryText = (filter: DishFilter): string => {
  const chosen = activeChoices(filter).map(choiceLabel);
  return chosen.length === 0 ? strings.browse.anything : chosen.join(' · ');
};

const rowOf = (
  row: ListRow,
  list: ListScreen,
  current: string | undefined,
  useUp: UseUpNow | undefined,
): HTMLElement => {
  const { entry } = row;
  const item = el('li');
  item.dataset.key = entry.key;
  const a = el('a', `entry-row row-link dish-row dish-row-${entry.origin}`);
  a.href = entry.href;
  if (entry.origin === 'own' && entry.id === current) a.setAttribute('aria-current', 'page');
  a.addEventListener('click', () => noteOpenedFromList(list, entry.href));
  a.append(el('span', 'entry-name', entry.name));
  const meta = metaText(row, useUp);
  if (meta !== '') a.append(el('span', 'entry-meta', meta));
  item.append(a);
  return item;
};

export interface DishListOptions {
  /** The screen the list stands on: a dish opened from it leads back there. */
  screen: ListScreen;
  /** The id of the own dish shown beside the list. */
  current?: string;
  /** The label of the list of rows, for assistive technology. */
  listLabel: string;
  /** Shown instead of the rows when there is no dish at all. */
  empty?: Node[];
}

/** The order select of Cook's list: by name, or "Use up first". */
const orderSelect = (list: CookList, onChange: (next: CookList) => void): HTMLElement => {
  const tc = strings.cook;
  const control = el('select', 'field cook-order');
  control.id = nextId('cook-order');
  for (const [value, text] of [
    ['name', tc.orderName],
    ['use-up', tc.tabUseUp],
  ] as const) {
    const option = el('option', undefined, text);
    option.value = value;
    control.append(option);
  }
  control.value = list.order;
  control.addEventListener('change', () =>
    onChange({ ...list, order: control.value === 'use-up' ? 'use-up' : 'name' }),
  );
  const text = el('label', 'field-label', tc.orderLabel);
  text.htmlFor = control.id;
  const wrap = el('div', 'field-wrap');
  wrap.append(text, control);
  return wrap;
};

/**
 * The search, the switch and the order, the filter, the count and the rows. The entries are read
 * again once the catalogue is there (it gives the characters of the ingredients it places, and the
 * tree the finder needs for the shipped dishes), and the list is drawn again.
 */
export const dishList = (options: DishListOptions): HTMLElement => {
  const t = strings.browse;
  const block = el('div', 'dish-list');
  let entries = everyEntry();
  const store = browserStore();
  let list: CookList = readCookList(store);
  // The finder's answers for the current stock, asked again on every draw, not on every keystroke.
  let cook: CookNarrowing = {};
  let useUp: UseUpNow | undefined;
  const ask = (): void => {
    useUp = list.order === 'use-up' ? useUpNow() : undefined;
    cook = {
      ...(list.have ? { ready: readyNowKeys() } : {}),
      ...(useUp === undefined ? {} : { useUp: useUp.marks }),
    };
  };

  const input = el('input', 'field dish-search');
  input.type = 'search';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.id = nextId('search');
  input.value = search.query;
  const label = el('label', 'field-label', strings.notebook.searchLabel);
  label.htmlFor = input.id;
  const searchWrap = el('div', 'field-wrap');
  searchWrap.append(label, input);

  // The filter folds behind one line, so that the first rows are on a phone's first screen. A
  // native <details>: a button for assistive technology, Enter and Space open it.
  const fold = el('details', 'dish-filter-fold');
  fold.open = unfolded;
  fold.addEventListener('toggle', () => {
    unfolded = fold.open;
  });
  const summary = el('summary', 'dish-filter-summary');
  const summaryName = el('span', 'dish-filter-summary-name', t.filtersLabel);
  const summaryChoices = el('span', 'dish-filter-summary-choices');
  summary.append(summaryName, summaryChoices);
  const controls = el('div', 'dish-list-controls');
  fold.append(summary, controls);

  // "Only with what I have" and the order: drawn once; a change asks the finder again.
  const choices = el('div', 'cook-list-choices');
  const setList = (next: CookList): void => {
    list = next;
    writeCookList(store, list);
    ask();
    drawRows(currentDishFilter());
  };
  const haveTick = tick('cook-have', strings.cook.haveLabel, list.have, (on) =>
    setList({ ...list, have: on }),
  );
  const haveRow = el('div', 'tick-choices cook-have-row');
  haveRow.append(haveTick);
  const orderRow = el('div', 'cook-filters cook-order-row');
  orderRow.append(orderSelect(list, (next) => setList(next)));
  choices.append(haveRow, orderRow);
  const note = el('div', 'cook-list-note');

  const count = el('p', 'dish-count muted');
  count.setAttribute('aria-live', 'polite');
  const rows = el('div', 'dish-rows');

  const drawRows = (filter: DishFilter): void => {
    const view = dishListView(entries, filter, search.query, currentLang(), cook);
    count.textContent = t.count(view.rows.length);
    // Nothing in stock: "Only with what I have" keeps nothing, and the way to tick is offered.
    const noStock = list.have && notebookSource().stock.length === 0;
    note.replaceChildren(
      ...(noStock ? [nothingTicked()] : []),
      ...(useUp !== undefined && !useUp.anyDated
        ? [el('p', 'muted cook-no-dates', strings.cook.useUpNoDates)]
        : []),
    );
    if (noStock && view.total > 0) {
      count.hidden = true;
      rows.replaceChildren();
      return;
    }
    if (view.total === 0 || (view.rows.length === 0 && !namesRead)) {
      count.hidden = true;
      // Before the catalogue is there an empty result may not be the last word: say so quietly.
      const waiting = el('p', 'note-quiet dish-loading', t.loading);
      waiting.setAttribute('role', 'status');
      rows.replaceChildren(...(view.total === 0 && namesRead ? (options.empty ?? []) : [waiting]));
      return;
    }
    count.hidden = false;
    if (view.rows.length === 0) {
      const all = el('button', 'btn quiet dish-show-all', t.reset);
      all.type = 'button';
      all.addEventListener('click', () => {
        search.query = '';
        input.value = '';
        // "Show all" also lets go of "Only with what I have"; the order stays.
        if (list.have) {
          list = { ...list, have: false };
          writeCookList(store, list);
          (haveTick.querySelector('input') as HTMLInputElement).checked = false;
          ask();
        }
        change(EMPTY_FILTER);
        // The button is gone with the empty state; the search field takes the focus.
        input.focus();
      });
      rows.replaceChildren(el('p', 'empty', t.none), all);
      return;
    }
    const ul = el('ul', 'rows dish-rows-list');
    ul.setAttribute('aria-label', options.listLabel);
    ul.append(...view.rows.map((row) => rowOf(row, options.screen, options.current, useUp)));
    rows.replaceChildren(ul);
  };

  // The controls are drawn anew on every change; the control that had focus keeps it.
  const drawControls = (filter: DishFilter): void => {
    summaryChoices.textContent = summaryText(filter);
    replaceFilterControls(controls, dishFilterControls(filter, offeredBy(entries, ORDER), change));
  };

  function change(next: DishFilter): void {
    keepDishFilter(next);
    drawControls(next);
    drawRows(next);
  }

  const draw = (): void => {
    ask();
    const filter = currentDishFilter();
    drawControls(filter);
    drawRows(filter);
  };

  input.addEventListener('input', () => {
    search.query = input.value;
    drawRows(currentDishFilter());
  });
  draw();
  // The catalogue gives the characters of the shipped ingredients; draw again once it is there.
  void loadNames().then(() => {
    namesRead = true;
    entries = everyEntry();
    draw();
  });

  block.append(searchWrap, choices, fold, note, count, rows);
  return block;
};
