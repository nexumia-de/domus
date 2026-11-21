// The one list of every dish, the notebook's and the shipped ones, as the Dishes list and the start
// screen show it: the search, the shared filter controls (dish-filter.ts), a count line and one row
// per dish. The filter is the one stored choice (browse/filter.ts), so both screens show the same;
// the search text lives as long as the page. The order and the meta are in browse/list-view.ts.
import { dishEntries } from '../browse/entries';
import type { DishEntry } from '../browse/entry';
import { EMPTY_FILTER, offeredBy, readDishFilter, writeDishFilter } from '../browse/filter';
import type { DishFilter } from '../browse/filter';
import { dishListView, type ListRow } from '../browse/list-view';
import { CHARACTER_TABLE } from '../characters/table';
import { currentLang } from '../classics/lang';
import { COUNTRIES } from '../classics/list-view';
import { loadNames } from '../classics/names';
import { browserStore } from '../prefs';
import { el } from '../shell/el';
import { strings } from '../strings';
import {
  COURSE_ORDER,
  courseLabel,
  cuisineLabel,
  dishFilterControls,
  replaceFilterControls,
} from './dish-filter';
import { nextId } from './fields';

/** The choice when the browser cannot keep it (private mode, no storage): kept for this page only. */
let unkept: DishFilter | undefined;

/** The one stored filter over every dish. */
export const currentDishFilter = (): DishFilter => unkept ?? readDishFilter(browserStore());

/** Stores the filter; where the browser cannot keep it, it holds until the page is closed. */
export const keepDishFilter = (filter: DishFilter): void => {
  unkept = writeDishFilter(browserStore(), filter) ? undefined : filter;
};

/** The search text, shared by the Dishes list and Start, until the page is closed. */
const search = { query: '' };

/** Every dish as an entry, in the content language (cached: browse/entries.ts). */
export const everyEntry = (): readonly DishEntry[] => dishEntries();

const ORDER = {
  characters: CHARACTER_TABLE.map((c) => c.id),
  courses: COURSE_ORDER,
  cuisines: COUNTRIES,
};

const metaText = ({ meta }: ListRow): string =>
  [
    meta.course === undefined ? undefined : courseLabel(meta.course),
    meta.cuisine === undefined ? undefined : cuisineLabel(meta.cuisine),
    meta.origin === undefined ? undefined : strings.browse.rowOrigin[meta.origin],
  ]
    .filter((part) => part !== undefined)
    .join(' · ');

const rowOf = (row: ListRow, current: string | undefined): HTMLElement => {
  const { entry } = row;
  const item = el('li');
  item.dataset.key = entry.key;
  const a = el('a', `entry-row row-link dish-row dish-row-${entry.origin}`);
  a.href = entry.href;
  if (entry.origin === 'own' && entry.id === current) a.setAttribute('aria-current', 'page');
  a.append(el('span', 'entry-name', entry.name));
  const meta = metaText(row);
  if (meta !== '') a.append(el('span', 'entry-meta', meta));
  item.append(a);
  return item;
};

export interface DishListOptions {
  /** The id of the own dish shown beside the list. */
  current?: string;
  /** The label of the list of rows, for assistive technology. */
  listLabel: string;
  /** Shown instead of the rows when there is no dish at all. */
  empty?: Node[];
}

/**
 * The search, the filter, the count and the rows. The entries are read again once the catalogue
 * is there (it gives the characters of the ingredients it places), and the list is drawn again.
 */
export const dishList = (options: DishListOptions): HTMLElement => {
  const t = strings.browse;
  const block = el('div', 'dish-list');
  let entries = everyEntry();

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

  const controls = el('div', 'dish-list-controls');
  const count = el('p', 'dish-count muted');
  count.setAttribute('aria-live', 'polite');
  const rows = el('div', 'dish-rows');

  const drawRows = (filter: DishFilter): void => {
    const view = dishListView(entries, filter, search.query, currentLang());
    count.textContent = t.count(view.rows.length);
    if (view.total === 0) {
      count.hidden = true;
      rows.replaceChildren(...(options.empty ?? []));
      return;
    }
    count.hidden = false;
    if (view.rows.length === 0) {
      const all = el('button', 'btn quiet dish-show-all', t.reset);
      all.type = 'button';
      all.addEventListener('click', () => {
        search.query = '';
        input.value = '';
        change(EMPTY_FILTER);
      });
      rows.replaceChildren(el('p', 'empty', t.none), all);
      return;
    }
    const list = el('ul', 'rows dish-rows-list');
    list.setAttribute('aria-label', options.listLabel);
    list.append(...view.rows.map((row) => rowOf(row, options.current)));
    rows.replaceChildren(list);
  };

  // The controls are drawn anew on every change; the control that had focus keeps it.
  const drawControls = (filter: DishFilter): void =>
    replaceFilterControls(controls, dishFilterControls(filter, offeredBy(entries, ORDER), change));

  function change(next: DishFilter): void {
    keepDishFilter(next);
    drawControls(next);
    drawRows(next);
  }

  const draw = (): void => {
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
    entries = everyEntry();
    draw();
  });

  block.append(searchWrap, controls, count, rows);
  return block;
};
