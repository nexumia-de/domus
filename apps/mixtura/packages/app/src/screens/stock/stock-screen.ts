// The Stock view: summary, search with quick entry, the show choice, bulk
// actions and the tree (docs/screens-stock-settings.md#stock). The search
// text and the show choice live in the address; the open groups in memory.

import { searchField } from '../../components/search-field';
import { h } from '../../dom';
import { replace } from '../../navigation';
import { formatHash } from '../../router';
import { type ScreenContext, type ScreenView } from '../../screen';
import { deriveStock, drinkCounts } from '../../stock/derived';
import { changeStock, stockState, withPresent, type StockChange } from '../../stock/state';
import { strings } from '../../strings';
import { showToast } from '../../toast';
import { browseState } from '../browse/load';
import type { BrowseModel } from '../browse/model';
import { failedStatus, loadingStatus } from '../drinks/pane';
import { status } from '../status';
import { COMMON_STOCK } from './common';
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

const expanded = new Set<string>();

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
  const { records, writable } = state;
  const q = (context.route.query.get('q') ?? '').trim();
  const show = parseShow(context.route.query.get('show'));
  const roots = buildStockTree(model.tree, records, drinkCounts(model), strings.stock.other);
  const view = viewRows(roots, { q, show, expanded });
  const present = countPresent(roots);
  const narrowed = isNarrowed({ q, show });
  const toMark = markTargets(view.matches);
  const toClear = clearTargets(view.matches);

  const apply = (changes: StockChange[], text: string): void => {
    const undo = changeStock(context, changes);
    if (undo.length > 0) showToast(context.store, text, () => changeStock(context, undo));
  };
  const toggle = (node: StockNode): void => {
    if (!writable) return;
    const on = !node.present;
    const text = !on
      ? strings.stock.markedOut(node.name)
      : node.children.length > 0
        ? strings.stock.markedType(node.name)
        : strings.stock.marked(node.name);
    apply([{ id: node.id, next: withPresent(records, node.id, on) }], text);
  };
  const setMany = (nodes: StockNode[], on: boolean): void => {
    const changes = nodes
      .filter((n) => n.present !== on)
      .map((n) => ({ id: n.id, next: withPresent(records, n.id, on) }));
    if (changes.length === 0) return;
    apply(changes, (on ? strings.stock.markedMany : strings.stock.clearedMany)(changes.length));
  };
  const setQuery = (next: string, nextShow: Show = show): void =>
    replace(context.store, hashFor(next, nextShow));

  const search = searchField({
    value: q,
    label: strings.stock.searchLabel,
    hint: strings.stock.searchHint,
    clearLabel: strings.stock.clearSearch,
    onChange: (next) => setQuery(next),
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
    summary(model, context, present),
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
      ? status(strings.stock.noHit)
      : stockTree(view.rows, {
          writable,
          toggle,
          expand: (node) => {
            if (expanded.has(node.id)) expanded.delete(node.id);
            else expanded.add(node.id);
            context.store.set({ stockRev: context.store.get().stockRev + 1 });
          },
        }),
  );
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
