// The drinks list pane: search field, Filters button, active filters as
// chips, the rows and the filters sheet (docs/screens-browse.md#drinks-list).
// Search and filters live in the address; typing is debounced and rewrites
// the current entry, so Back leaves the list instead of undoing keystrokes.

import * as glyph from '../../components/glyphs';
import { headerLink } from '@nexumia-de/hospes/frame';
import { menuButton } from '../../components/menu-button';
import { searchField } from '../../components/search-field';
import { h } from '../../dom';
import { back, go, replace } from '../../navigation';
import { type ScreenContext } from '../../screen';
import { formatHash } from '../../router';
import { listKey } from '../../shell/scroll';
import { deriveStock } from '../../stock/derived';
import { stockState } from '../../stock/state';
import { strings } from '../../strings';
import {
  activeFilters,
  applyFilters,
  chipsOf,
  parseFilters,
  poolOf,
  withFilter,
  type Filters,
} from '../browse/filters';
import { alcoholOf, thresholdsFor, unknownGroups } from '../browse/alcohol';
import type { BrowseModel } from '../browse/model';
import { parseSort, sortDrinks, SORT_IDS, sortParams, type SortId } from '../browse/sort';
import { status } from '../status';
import { whileHere } from '../still-here';
import { filtersSheet } from './filters-sheet';
import { unknownDetails } from './alcohol-unknown';
import { drinkRow } from './row';
import { incrementalRows } from './rows';
import { installDrinksKeys } from './shortcuts';
import { hashWith, specHash } from './url';

let sheetWasOpen = false;

const wide = (): boolean => window.matchMedia('(min-width: 840px)').matches;

function filtersButton(context: ScreenContext, filters: Filters): HTMLElement {
  const n = activeFilters(filters).length;
  const label = n > 0 ? strings.browse.filtersActive(n) : strings.browse.filters;
  return h(
    'button',
    {
      class: 'btn',
      type: 'button',
      'aria-label': label,
      title: label,
      'data-focus': 'filters',
      onclick: () => {
        const hash = hashWith(context.route, filters, 'filters');
        if (wide()) replace(context.store, hash);
        else go(context.store, hash);
      },
    },
    glyph.filter(),
    n > 0 && String(n),
  );
}

/** The sort menu: the order is the `sort` parameter of the address; Name is the default and has none. */
function sortMenu(context: ScreenContext, sort: SortId): HTMLElement {
  const words = strings.browse.sort;
  return menuButton({
    label: words.button(words.words[sort]),
    menuLabel: words.menu,
    focusKey: 'sort',
    icon: glyph.sort(),
    items: SORT_IDS.map((id) => ({ id, label: words.words[id], checked: id === sort })),
    onSelect: (id) => {
      const query = new URLSearchParams(context.route.query);
      query.delete('sort');
      for (const [key, value] of sortParams(id as SortId)) query.set(key, value);
      replace(context.store, formatHash(context.route.path, query));
    },
  });
}

function chipRow(context: ScreenContext, model: BrowseModel, filters: Filters): HTMLElement | null {
  const chips = chipsOf(model, filters, {
    template: strings.browse.templateChip,
    makeable: (value) =>
      value === 'substitute'
        ? strings.browse.availability.substitute
        : value === 'one'
          ? strings.browse.availability.one
          : strings.browse.availability.yes,
    alcohol: (value) => strings.browse.alcohol.classWords[value] ?? value,
    status: (value) =>
      strings.browse.statusChip(
        strings.spec.status[value as keyof typeof strings.spec.status] ?? value,
      ),
    base: strings.browse.baseChip,
  });
  if (chips.length === 0) return null;
  return h(
    'div',
    { class: 'chips', role: 'group', 'aria-label': strings.browse.filters },
    ...chips.map((chip) =>
      h(
        'button',
        {
          class: 'chip',
          type: 'button',
          'aria-pressed': 'true',
          'aria-label': strings.browse.removeFilter(chip.label),
          onclick: () => {
            replace(context.store, hashWith(context.route, withFilter(filters, chip.key)));
          },
        },
        chip.label,
        glyph.close(),
      ),
    ),
  );
}

function closeSheet(context: ScreenContext, filters: Filters): void {
  const without = hashWith(context.route, filters, null);
  if (wide()) replace(context.store, without);
  else back(context.store, without);
}

/**
 * The list pane for the current route; `selected` is the lineage id of the
 * open drink. The list itself is the same on every route that shows it.
 */
export function drinksListPane(
  context: ScreenContext,
  model: BrowseModel,
  selected?: string,
): { title: string; body: Node; action: HTMLElement } {
  installDrinksKeys(context.store);
  const filters = parseFilters(context.route.query);
  const stock = stockState(context);
  const derived = stock.kind === 'ready' ? deriveStock(model, stock.records) : undefined;
  const thresholds = thresholdsFor(context.state.alcoholWithout, context.state.alcoholLow);
  const pool = poolOf(model, filters);
  const sort = parseSort(context.route.query);
  const hits = sortDrinks(
    model,
    applyFilters(model, filters, pool, derived?.states, thresholds),
    sort,
  );
  // Drinks that match everything but the alcohol filter, and whose class is unknown.
  const unclassified =
    filters.alcohol === undefined
      ? []
      : unknownGroups(
          model,
          applyFilters(model, { ...filters, alcohol: undefined }, pool, derived?.states).filter(
            (d) => alcoholOf(model, d, thresholds).class === 'unknown',
          ),
          thresholds,
        );
  const unclassifiedCount = unclassified.reduce((n, g) => n + g.drinks.length, 0);
  const key = listKey(context.route);
  const sheetOpen = context.route.query.get('sheet') === 'filters';

  // The list's one tab stop: the open drink, else the first one.
  const tabStop = hits.find((d) => d.spec.lineageId === selected) ?? hits[0];
  const waitingForStock = filters.makeable !== undefined && stock.kind === 'loading';
  const noStock =
    filters.makeable !== undefined && derived !== undefined && derived.states.size === 0;
  const rows =
    model.drinks.length === 0
      ? [status(strings.browse.noData)]
      : waitingForStock
        ? [status(strings.browse.loading)]
        : noStock
          ? [
              status(strings.empty.makeableEmpty, {
                label: strings.browse.availability.openStock,
                href: '#/stock',
              }),
            ]
          : hits.length === 0
            ? [
                status(strings.browse.noHit, {
                  label: strings.browse.clearFilters,
                  onclick: () => replace(context.store, hashWith(context.route, { q: '' })),
                }),
              ]
            : incrementalRows(hits, key, (drink) =>
                drinkRow(
                  model,
                  drink,
                  specHash(drink.spec.lineageId, filters, sort),
                  drink.spec.lineageId === selected,
                  derived?.states.get(drink.spec.id),
                  filters.alcohol === undefined ? undefined : alcoholOf(model, drink, thresholds),
                  drink === tabStop,
                ),
              );

  const body = h(
    'div',
    { class: 'list-body' },
    h(
      'div',
      { class: 'search' },
      searchField({
        value: filters.q,
        label: strings.browse.searchLabel,
        hint: strings.browse.searchHint,
        clearLabel: strings.browse.clearSearch,
        // Lands 200 ms after the last key: only while this screen is still the address,
        // and against the address as it is by then.
        onChange: (q) =>
          whileHere(context, (now) =>
            replace(context.store, hashWith(now, { ...parseFilters(now.query), q })),
          ),
      }),
      sortMenu(context, sort),
      filtersButton(context, filters),
    ),
    chipRow(context, model, filters),
    h(
      'p',
      { class: 'note list-count', role: 'status' },
      strings.browse.count(hits.length, model.drinks.length),
    ),
    sort !== 'name' &&
      h('p', { class: 'note' }, strings.browse.sort.sortedBy(strings.browse.sort.words[sort])),
    unclassifiedCount > 0 && unknownDetails(unclassified, unclassifiedCount, filters, sort),
    ...rows,
    sheetOpen &&
      filtersSheet(model, filters, hits.length, derived, thresholds, {
        apply: (next) => replace(context.store, hashWith(context.route, next)),
        close: () => closeSheet(context, filters),
      }),
  );
  if (sheetOpen && !sheetWasOpen) {
    requestAnimationFrame(() => body.querySelector<HTMLElement>('[data-sheet]')?.focus());
  }
  // Closing the sheet returns focus to the button that opened it (the dialog pattern). Without
  // scrolling: on a slow device this runs a frame late, after the user has scrolled on.
  if (!sheetOpen && sheetWasOpen) {
    requestAnimationFrame(() =>
      body.querySelector<HTMLElement>('[data-focus="filters"]')?.focus({ preventScroll: true }),
    );
  }
  sheetWasOpen = sheetOpen;

  return {
    title: strings.titles.drinks,
    body,
    action: headerLink(strings.buttons.newDrinkIcon, 'add', '#/drinks/new'),
  };
}
