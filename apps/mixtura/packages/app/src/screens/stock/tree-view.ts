// The rows of the stock tree: per node a check box (the whole row is the
// button, 44 px high at least), name, a line saying the state in words, and
// for groups an open/close button. Shape and words carry the state, never
// colour alone.

import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import { strings } from '../../strings';
import { batchStrings } from './batch-strings';
import { treeKeys } from './tree-keys';
import type { Row, StockNode } from './tree-model';

export interface TreeActions {
  toggle(node: StockNode): void;
  expand(node: StockNode): void;
  batches(node: StockNode): void;
  /** Opens the sheet with one block per counting place. */
  places(node: StockNode): void;
  writable: boolean;
}

function stateWord(node: StockNode): string {
  if (node.present) return strings.stock.inStock;
  return node.tracked ? strings.stock.out : strings.stock.notTracked;
}

function subLine(node: StockNode, group: boolean): string {
  const parts: string[] = [];
  if (node.children.length === 0) parts.push(stateWord(node));
  if (node.batches > 0) parts.push(batchStrings.count(node.batches));
  else if (!group) {
    // The group's own count is at the end of its row.
    if (node.level !== 'group') parts.push(strings.stock.levels[node.level]);
    if (node.present) parts.push(strings.stock.inStock);
    parts.push(strings.stock.productsMarked(node.marked, node.leaves));
  }
  if (node.drinks > 0) parts.push(strings.stock.inDrinks(node.drinks));
  return parts.join(' · ');
}

function expander(node: StockNode, open: boolean, actions: TreeActions): HTMLElement {
  const label = open ? strings.stock.collapse(node.name) : strings.stock.expand(node.name);
  return h(
    'button',
    {
      class: `btn btn--icon stock-expand${open ? ' is-open' : ''}`,
      type: 'button',
      'data-expand': node.id,
      'data-focus': `expand:${node.id}`,
      'aria-expanded': open ? 'true' : 'false',
      'aria-label': label,
      title: label,
      onclick: () => actions.expand(node),
    },
    glyph.chevron(),
  );
}

function batchButton(node: StockNode, actions: TreeActions): HTMLElement {
  return h(
    'button',
    {
      class: 'btn btn--text stock-batches-button',
      type: 'button',
      'data-batches': node.id,
      'data-focus': `batches:${node.id}`,
      'aria-label': batchStrings.buttonAria(node.name),
      onclick: () => actions.batches(node),
    },
    batchStrings.button,
  );
}

function placesButton(node: StockNode, depth: number, actions: TreeActions): HTMLElement {
  return h(
    'button',
    {
      class: 'stock-places-line',
      type: 'button',
      style: `padding-left: calc(var(--sp-2) + ${depth * 20}px + 44px)`,
      'data-places': '',
      'data-focus': `places:${node.id}`,
      'aria-label': strings.places.forAria(node.name),
      onclick: () => actions.places(node),
    },
    node.places.join(' · '),
  );
}

function rowOf(row: Row, actions: TreeActions): HTMLElement {
  const { node, depth } = row;
  const open = row.expanded === true;
  const group = depth === 0;
  const counts = node.children.length > 0 && group;
  const main = h(
    'span',
    { class: 'row-main' },
    h('span', { class: 'row-title' }, node.name),
    h('span', { class: 'row-sub' }, subLine(node, depth === 0)),
  );
  const end =
    counts &&
    h('span', { class: 'row-end num' }, strings.stock.leafCount(node.marked, node.leaves));
  const attrs = { 'data-row': node.id, 'data-parent': row.parentId ?? undefined };
  const style = `padding-left: calc(var(--sp-2) + ${depth * 20}px)`;
  if (node.synthetic) {
    return h(
      'li',
      attrs,
      h(
        'div',
        { class: 'row stock-row stock-row--group', style },
        h(
          'button',
          {
            class: 'stock-toggle',
            type: 'button',
            'data-toggle': node.id,
            'data-expand': node.id,
            'data-focus': `node:${node.id}`,
            'aria-expanded': open ? 'true' : 'false',
            onclick: () => actions.expand(node),
          },
          h('span', { class: 'stock-chevron', 'aria-hidden': 'true' }, glyph.chevron()),
          main,
          end,
        ),
      ),
    );
  }
  const checkbox = h(
    'button',
    {
      class: 'stock-toggle',
      type: 'button',
      role: 'checkbox',
      'aria-checked': node.present ? 'true' : 'false',
      'aria-label': strings.stock.checkName(node.name),
      'aria-disabled': actions.writable ? undefined : 'true',
      'data-toggle': node.id,
      'data-focus': `node:${node.id}`,
      onclick: () => actions.toggle(node),
    },
    h(
      'span',
      { class: `check${node.present ? ' on' : ''}`, 'aria-hidden': 'true' },
      node.present && glyph.check(),
    ),
    main,
    end,
  );
  return h(
    'li',
    attrs,
    h(
      'div',
      { class: `row stock-row${group ? ' stock-row--group' : ''}`, style },
      checkbox,
      node.prepared && node.children.length === 0 ? batchButton(node, actions) : null,
      row.expanded === null ? null : expander(node, open, actions),
    ),
    node.places.length > 0 ? placesButton(node, depth, actions) : null,
  );
}

export function stockTree(rows: readonly Row[], actions: TreeActions): HTMLElement {
  const list = h('ul', { class: 'rows stock-tree', 'aria-label': strings.titles.stock });
  list.addEventListener('keydown', treeKeys);
  for (const row of rows) list.appendChild(rowOf(row, actions));
  return list;
}
