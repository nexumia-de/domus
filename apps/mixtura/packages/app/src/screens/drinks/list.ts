// The drinks list pane: search field, Filters button, active filters as
// chips, the rows and the filters sheet (docs/screens-browse.md#drinks-list).
// Search and filters live in the address; typing is debounced and rewrites
// the current entry, so Back leaves the list instead of undoing keystrokes.

import * as glyph from '../../components/glyphs';
import { searchField } from '../../components/search-field';
import { h } from '../../dom';
import { back, go, replace } from '../../navigation';
import { type ScreenContext } from '../../screen';
import { listKey } from '../../shell/scroll';
import { deriveStock } from '../../stock/derived';
import { stockState } from '../../stock/state';
import { strings } from '../../strings';
import {
  activeFilters,
  applyFilters,
  chipsOf,
  parseFilters,
  withFilter,
  type Filters,
} from '../browse/filters';
import type { BrowseModel } from '../browse/model';
import { status } from '../status';
import { filtersSheet } from './filters-sheet';
import { drinkRow } from './row';
import { incrementalRows } from './rows';
import { hashWith, specHash } from './url';

let sheetWasOpen = false;
let shortcut = false;

const wide = (): boolean => window.matchMedia('(min-width: 840px)').matches;

/** `/` focuses the search field when no field has focus (docs/behaviour.md#interaction-rules). */
function installShortcut(): void {
  if (shortcut) return;
  shortcut = true;
  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    if (event.key !== '/' || target?.closest('input, textarea, select')) return;
    const field = document.querySelector<HTMLElement>('[data-focus="search"]');
    if (!field) return;
    event.preventDefault();
    field.focus();
  });
}

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

function chipRow(context: ScreenContext, model: BrowseModel, filters: Filters): HTMLElement | null {
  const chips = chipsOf(model, filters, {
    template: strings.browse.templateChip,
    makeable: (value) =>
      value === 'substitute'
        ? strings.browse.availability.substitute
        : value === 'one'
          ? strings.browse.availability.one
          : strings.browse.availability.yes,
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
): { title: string; body: Node; action: Node } {
  installShortcut();
  const filters = parseFilters(context.route.query);
  const stock = stockState(context);
  const derived = stock.kind === 'ready' ? deriveStock(model, stock.records) : undefined;
  const hits = applyFilters(model, filters, model.drinks, derived?.states);
  const key = listKey(context.route);
  const sheetOpen = context.route.query.get('sheet') === 'filters';

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
                  specHash(drink.spec.lineageId, filters),
                  drink.spec.lineageId === selected,
                  derived?.states.get(drink.spec.id),
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
        onChange: (q) => replace(context.store, hashWith(context.route, { ...filters, q })),
      }),
      filtersButton(context, filters),
    ),
    chipRow(context, model, filters),
    h(
      'p',
      { class: 'note list-count', role: 'status' },
      strings.browse.count(hits.length, model.drinks.length),
    ),
    ...rows,
    sheetOpen &&
      filtersSheet(model, filters, hits.length, derived, {
        apply: (next) => replace(context.store, hashWith(context.route, next)),
        close: () => closeSheet(context, filters),
      }),
  );
  if (sheetOpen && !sheetWasOpen) {
    requestAnimationFrame(() => body.querySelector<HTMLElement>('[data-sheet]')?.focus());
  }
  sheetWasOpen = sheetOpen;

  return {
    title: strings.titles.drinks,
    body,
    action: h(
      'a',
      {
        class: 'btn btn--icon',
        href: '#/drinks/new',
        'aria-label': strings.buttons.newDrinkIcon,
        title: strings.buttons.newDrinkIcon,
      },
      glyph.plus(),
    ),
  };
}
