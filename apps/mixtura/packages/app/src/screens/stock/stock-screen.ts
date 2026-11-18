// The Stock view: summary, search with quick entry, the show choice, bulk
// actions and the tree (docs/screens-stock-settings.md#stock). The search
// text and the show choice live in the address; the open groups in memory.

import { searchField } from '../../components/search-field';
import { h } from '../../dom';
import { replace } from '../../navigation';
import { formatHash } from '../../router';
import { type ScreenContext, type ScreenView } from '../../screen';
import { nearDate } from '../../stock/batches';
import { today } from '../../today';
import { deriveStock, drinkCounts } from '../../stock/derived';
import { changeStock, stockState, withPresent, type StockChange } from '../../stock/state';
import { strings } from '../../strings';
import { showToast } from '../../toast';
import { browseState } from '../browse/load';
import type { BrowseModel } from '../browse/model';
import { failedStatus, loadingStatus } from '../drinks/pane';
import { status } from '../status';
import { COMMON_STOCK } from './common';
import { batchesFocus, batchesSheet, openBatches } from './batches-sheet';
import { createOpen, createSheet, openCreate } from './create-sheet';
import { placesLine } from './places-line';
import { placesFocus, placesSheet } from './places-sheet';
import { stillPresent } from './still-present';
import { nearDateCard } from './near-date';
import {
  OTHER_ID,
  clearTargets,
  markTargets,
  buildStockTree,
  countPresent,
  firstMatch,
  isNarrowed,
  viewRows,
  type Show,
  type StockNode,
} from './tree-model';
import { stockTree } from './tree-view';
import { views } from './views';
import { whileHere } from '../still-here';

const expanded = new Set<string>();
let createWasOpen = false;

const SHOWS: readonly Show[] = ['all', 'in', 'out'];

function parseShow(value: string | null): Show {
  return SHOWS.find((s) => s === value) ?? 'all';
}

const hashFor = (q: string, show: Show): string => {
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (show !== 'all') query.set('show', show);
  return formatHash(['stock'], query);
};

function summary(model: BrowseModel, context: ScreenContext, present: number): HTMLElement {
  const state = stockState(context);
  const derived = state.kind === 'ready' ? deriveStock(model, state.records) : undefined;
  return h(
    'div',
    { class: 'card stock-summary' },
    h('strong', {}, strings.stock.summary(present)),
    derived &&
      present > 0 &&
      h(
        'span',
        { class: 'row-sub' },
        strings.stock.makeableLine(derived.counts.makeable, derived.counts.one),
      ),
    derived &&
      present > 0 &&
      h(
        'a',
        { class: 'btn btn--tonal', href: '#/drinks?makeable=yes' },
        strings.stock.showMakeable,
      ),
  );
}

export function stockView(context: ScreenContext): ScreenView {
  const title = strings.titles.stock;
  const browse = browseState(context);
  const state = stockState(context);
  if (browse.kind !== 'ready' || state.kind !== 'ready') {
    const body = browse.kind === 'failed' ? failedStatus(browse.reason) : loadingStatus();
    return { title, body: h('div', { class: 'stack' }, views('stock'), body) };
  }
  const { model } = browse;
  const { records, entryRecords, writable } = state;
  const entryName = state.selection.places.find((p) => p.id === state.selection.entry)?.name ?? '';
  const q = (context.route.query.get('q') ?? '').trim();
  const show = parseShow(context.route.query.get('show'));
  const roots = buildStockTree(
    model.tree,
    records,
    drinkCounts(model),
    strings.stock.other,
    state.presentAt,
  );
  const view = viewRows(roots, { q, show, expanded });
  const present = countPresent(roots);
  const narrowed = isNarrowed({ q, show });
  const toMark = markTargets(view.matches);
  const toClear = clearTargets(view.matches);

  // A mark in the combined view goes to the entry place; when another place still has the
  // ingredient the check mark stays, and the toast says why.
  const apply = (changes: StockChange[], text: string, off: readonly string[] = []): void => {
    const undo = changeStock(context, changes);
    const stays = stillPresent(stockState(context), off);
    const said = stays.length === 0 ? text : `${text}. ${stays.text}`;
    if (undo.length > 0) showToast(context.store, said, () => changeStock(context, undo));
    else if (stays.length > 0) showToast(context.store, stays.text);
  };
  // The check box shows the combined state and always acts on the entry place's own record.
  const toggle = (node: StockNode): void => {
    if (!writable) return;
    const own = entryRecords.get(node.id)?.present === true;
    const on = !own;
    const text = !on
      ? strings.stock.markedOut(node.name)
      : node.present
        ? strings.places.addedAt(entryName)
        : node.children.length > 0
          ? strings.stock.markedType(node.name)
          : strings.stock.marked(node.name);
    apply(
      [{ id: node.id, next: withPresent(entryRecords, node.id, on) }],
      text,
      on ? [] : [node.id],
    );
  };
  const setMany = (nodes: StockNode[], on: boolean): void => {
    const changes = nodes
      .filter((n) => (on ? !n.present : entryRecords.get(n.id)?.present === true))
      .map((n) => ({ id: n.id, next: withPresent(entryRecords, n.id, on) }));
    if (changes.length === 0) return;
    apply(
      changes,
      (on ? strings.stock.markedMany : strings.stock.clearedMany)(changes.length),
      on ? [] : changes.map((c) => c.id),
    );
  };
  const setQuery = (next: string, nextShow: Show = show): void =>
    replace(context.store, hashFor(next, nextShow));

  const search = searchField({
    value: q,
    label: strings.stock.searchLabel,
    hint: strings.stock.searchHint,
    clearLabel: strings.stock.clearSearch,
    // Lands 200 ms after the last key: only while Stock is still the screen.
    onChange: (next) => void whileHere(context, () => setQuery(next)),
    onEnter: (text) => {
      const hit = text ? firstMatch(roots, text) : undefined;
      if (!hit || hit.synthetic) return;
      toggle(hit);
      setQuery('');
    },
  });

  const chip = (value: Show): HTMLElement =>
    h(
      'button',
      {
        class: 'chip',
        type: 'button',
        'aria-pressed': show === value ? 'true' : 'false',
        onclick: () => setQuery(q, show === value ? 'all' : value),
      },
      strings.stock.show[value],
    );

  const common = COMMON_STOCK.filter((id) => model.tree.byId.has(id));
  const empty = present === 0 && !narrowed;
  const body = h(
    'div',
    { class: 'stack stock-screen' },
    views('stock'),
    placesLine(context, state),
    summary(model, context, present),
    nearDateCard(nearDate(model.tree, model.preparedSpecs, records, today()), (id) =>
      openBatches(context, id),
    ),
    h('div', { class: 'search' }, search),
    h(
      'div',
      { class: 'chips', role: 'group', 'aria-label': strings.stock.showGroup },
      ...SHOWS.map(chip),
    ),
    narrowed &&
      h(
        'div',
        { class: 'btn-row' },
        h(
          'button',
          {
            class: 'btn',
            type: 'button',
            disabled: !writable || toMark.length === 0,
            onclick: () => setMany(toMark, true),
          },
          strings.stock.markVisible,
        ),
        h(
          'button',
          {
            class: 'btn',
            type: 'button',
            disabled: !writable || toClear.length === 0,
            onclick: () => setMany(toClear, false),
          },
          strings.stock.clearVisible,
        ),
      ),
    h('p', { class: 'note' }, writable ? strings.stock.typeNote : strings.stock.readOnly),
    empty &&
      h(
        'div',
        { class: 'status stock-empty' },
        h('p', {}, strings.empty.stock),
        h(
          'button',
          {
            class: 'btn btn--tonal',
            type: 'button',
            disabled: !writable || common.length === 0,
            onclick: () =>
              setMany(
                common.flatMap((id) => {
                  const node = findNode(roots, id);
                  return node ? [node] : [];
                }),
                true,
              ),
          },
          strings.stock.markCommon(common.length),
        ),
        h('p', { class: 'note' }, strings.stock.commonHint),
      ),
    view.rows.length === 0
      ? status(
          strings.stock.noHit,
          writable && q !== '' && !firstMatch(roots, q)
            ? { label: strings.stock.create(q), onclick: () => openCreate(context, q) }
            : undefined,
        )
      : stockTree(view.rows, {
          writable,
          toggle,
          batches: (node) => openBatches(context, node.id),
          places: (node) => openBatches(context, node.id, 'places'),
          expand: (node) => {
            if (expanded.has(node.id)) expanded.delete(node.id);
            else expanded.add(node.id);
            context.store.set({ stockRev: context.store.get().stockRev + 1 });
          },
        }),
    batchesSheet(context, model, state),
    placesSheet(context, writable),
    createSheet(context, model),
  );
  batchesFocus(context, body);
  placesFocus(context, body);
  if (createOpen(context) && !createWasOpen) {
    requestAnimationFrame(() => body.querySelector<HTMLElement>('[data-sheet]')?.focus());
  }
  createWasOpen = createOpen(context);
  return { title, body };
}

function findNode(roots: readonly StockNode[], id: string): StockNode | undefined {
  for (const node of roots) {
    if (node.id === id && node.id !== OTHER_ID) return node;
    const inside = findNode(node.children, id);
    if (inside) return inside;
  }
  return undefined;
}
