// The versions screen: the drink's versions newest first, two can be chosen
// and compared. The chosen versions are in the address (`?pick=1,3`), so Back
// and a reload keep them; Compare opens the diff (`?a=1&b=3`).

import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import { go, replace } from '../../navigation';
import { formatHash, type Route } from '../../router';
import { type ScreenContext, type ScreenView } from '../../screen';
import { drinksPane } from '../drinks/pane';
import type { BrowseModel } from '../browse/model';
import { noVersion } from './common';
import { versionsVM, type VersionRow, type VersionsVM } from './list-vm';
import { versionStrings as vs } from './strings';

/** The two chosen version numbers, oldest first; unknown numbers are dropped. */
export function pickedOf(route: Route, rows: readonly VersionRow[]): number[] {
  const known = new Set(rows.map((r) => r.version));
  return [
    ...new Set(
      (route.query.get('pick') ?? '')
        .split(',')
        .map(Number)
        .filter((n) => Number.isInteger(n) && known.has(n)),
    ),
  ]
    .slice(0, 2)
    .sort((a, b) => a - b);
}

const withPick = (route: Route, picked: readonly number[]): string => {
  const query = new URLSearchParams(route.query);
  query.delete('pick');
  if (picked.length > 0) query.set('pick', picked.join(','));
  return formatHash(route.path, query);
};

function figureLine(row: VersionRow): HTMLElement {
  return h(
    'span',
    { class: 'row-sub num version-figures' },
    ...row.figures.map((f) =>
      h(
        'span',
        { class: 'version-figure' },
        `${f.name} ${f.value}`,
        f.positionShort ? ` ${f.positionShort}` : '',
      ),
    ),
  );
}

function rowView(context: ScreenContext, row: VersionRow, picked: readonly number[]): HTMLElement {
  const { route, store } = context;
  const on = picked.includes(row.version);
  return h(
    'li',
    { class: 'version-row', 'data-version': String(row.version) },
    h(
      'label',
      { class: 'version-pick' },
      h('input', {
        type: 'checkbox',
        checked: on,
        'data-pick': String(row.version),
        'aria-label': vs.choose(row.version),
        onchange: () => {
          const next = on
            ? picked.filter((n) => n !== row.version)
            : [...picked, row.version].slice(-2);
          replace(store, withPick(route, next));
        },
      }),
    ),
    h(
      'a',
      { class: 'row', href: row.href },
      h(
        'span',
        { class: 'row-main' },
        h(
          'span',
          { class: 'row-title' },
          vs.versionLine(row.version),
          row.newest ? ` · ${vs.newest}` : '',
        ),
        h('span', { class: 'row-sub' }, [row.date, row.status].filter(Boolean).join(' · ')),
        h('span', { class: row.note ? 'row-note' : 'row-sub' }, row.note ?? vs.noNote),
        h('span', { class: 'row-sub' }, row.summary),
        figureLine(row),
      ),
    ),
  );
}

function body(context: ScreenContext, vm: VersionsVM, picked: readonly number[]): HTMLElement {
  const only = vm.rows.length === 1;
  return h(
    'div',
    { class: 'versions' },
    h('p', { class: 'note' }, only ? vs.onlyOne : vs.compareHint),
    h(
      'ul',
      { class: 'version-list', 'aria-label': vs.title },
      ...vm.rows.map((r) => rowView(context, r, picked)),
    ),
    vm.statusLog.length > 0 &&
      h(
        'section',
        { class: 'card', 'aria-label': vs.statusHistory },
        h('h2', {}, vs.statusHistory),
        h('ul', { class: 'status-log' }, ...vm.statusLog.map((text) => h('li', {}, text))),
      ),
  );
}

export function listView(context: ScreenContext, model: BrowseModel, id: string): ScreenView {
  const vm = versionsVM(model, id);
  if (!vm) return noVersion(context);
  const picked = pickedOf(context.route, vm.rows);
  const ready = picked.length === 2;
  const [a, b] = picked;
  const lineage = encodeURIComponent(id);
  return {
    title: vs.titleOf(vm.name),
    body: body(context, vm, picked),
    actions: h(
      'div',
      { class: 'bar-buttons' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--primary',
          'data-action': 'compare',
          'data-focus': 'compare',
          disabled: !ready,
          'aria-describedby': 'compare-hint',
          onclick: () => go(context.store, `#/drinks/${lineage}/versions?a=${a}&b=${b}`),
        },
        glyph.swap(),
        vs.compare,
      ),
      h(
        'span',
        { id: 'compare-hint', class: 'visually-hidden' },
        picked.length === 1 ? vs.compareOne : vs.compareHint,
      ),
    ),
    list: drinksPane(context, 'detail', id),
  };
}
