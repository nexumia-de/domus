// The one list of every dish, the notebook's and the shipped ones, as the Dishes list and the start
// screen show it: the search, the shared filter controls (dish-filter.ts) folded behind a summary
// line of the active choices, a count line and one row per dish. The filter is the one kept choice
// (`currentDishFilter`/`keepDishFilter` in browse/filter.ts), so both screens show the same; the
// search text lives as long as the page. The order and the meta are in browse/list-view.ts.
import { allEntries, type DishEntry } from '../browse/entry';
import {
  COURSE_ORDER,
  currentDishFilter,
  EMPTY_FILTER,
  keepDishFilter,
  offeredBy,
  type DishFilter,
} from '../browse/filter';
import { activeChoices, dishListView, type ActiveChoice, type ListRow } from '../browse/list-view';
import { characterLookup } from '../characters/lookup';
import { CHARACTER_TABLE } from '../characters/table';
import { characterLabel } from '../characters/view';
import { classics } from '../classics/content';
import { currentLang } from '../classics/lang';
import { COUNTRIES } from '../classics/list-view';
import { loadNames } from '../classics/names';
import { listDishes, notebook } from '../notebook';
import { el } from '../shell/el';
import { strings } from '../strings';
import { courseLabel, cuisineLabel, dishFilterControls } from './dish-filter';
import { nextId } from './fields';
import { noteOpenedFromList, type ListScreen } from './list-return';

/** The search text, shared by the Dishes list and Start, until the page is closed. */
const search = { query: '' };

/** Whether the filter is unfolded; it stays so between the two screens until the page closes. */
let unfolded = false;

/**
 * True once the catalogue has been read (or could not be): before that, a dish's characters and
 * whether it is without meat are not all known, and the list does not say that nothing fits.
 */
let namesRead = false;

/** Every dish as an entry, in the content language. */
export const everyEntry = (): DishEntry[] =>
  allEntries(notebook(), listDishes(), classics(), characterLookup, currentLang());

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

const rowOf = (row: ListRow, list: ListScreen, current: string | undefined): HTMLElement => {
  const { entry } = row;
  const item = el('li');
  item.dataset.key = entry.key;
  const a = el('a', `entry-row row-link dish-row dish-row-${entry.origin}`);
  a.href = entry.href;
  if (entry.origin === 'own' && entry.id === current) a.setAttribute('aria-current', 'page');
  a.addEventListener('click', () => noteOpenedFromList(list, entry.href));
  a.append(el('span', 'entry-name', entry.name));
  const meta = metaText(row);
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

  const count = el('p', 'dish-count muted');
  count.setAttribute('aria-live', 'polite');
  const rows = el('div', 'dish-rows');

  const drawRows = (filter: DishFilter): void => {
    const view = dishListView(entries, filter, search.query, currentLang());
    count.textContent = t.count(view.rows.length);
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
        change(EMPTY_FILTER);
        // The button is gone with the empty state; the search field takes the focus.
        input.focus();
      });
      rows.replaceChildren(el('p', 'empty', t.none), all);
      return;
    }
    const list = el('ul', 'rows dish-rows-list');
    list.setAttribute('aria-label', options.listLabel);
    list.append(...view.rows.map((row) => rowOf(row, options.screen, options.current)));
    rows.replaceChildren(list);
  };

  // The controls are drawn anew on every change; the control that had focus keeps it.
  const drawControls = (filter: DishFilter): void => {
    summaryChoices.textContent = summaryText(filter);
    const active = document.activeElement;
    const focusClass =
      active instanceof HTMLElement && controls.contains(active)
        ? [
            ...(active instanceof HTMLSelectElement ? active : (active.parentElement ?? active))
              .classList,
          ].find((c) => c.startsWith('dish-filter-'))
        : undefined;
    controls.replaceChildren(dishFilterControls(filter, offeredBy(entries, ORDER), change));
    if (focusClass !== undefined) {
      const again = controls.querySelector<HTMLElement>(`.${focusClass}`);
      (again instanceof HTMLLabelElement ? again.querySelector('input') : again)?.focus();
    }
  };

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
    namesRead = true;
    entries = everyEntry();
    draw();
  });

  block.append(searchWrap, fold, count, rows);
  return block;
};
