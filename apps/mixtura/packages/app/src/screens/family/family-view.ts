// The family screen: the parent chain on top, the drink, its riffs below, and
// the other riffs of its parent after them. Each entry opens that drink.

import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import { type ScreenContext, type ScreenView } from '../../screen';
import { drinksPane } from '../drinks/pane';
import type { BrowseModel } from '../browse/model';
import { notFound } from '../versions/common';
import { versionStrings as vs } from '../versions/strings';
import { strings } from '../../strings';
import { familyVM, type FamilyEntry, type FamilyVM } from './family-vm';

function entryView(entry: FamilyEntry): HTMLElement {
  const self = entry.role === 'self';
  return h(
    'li',
    {
      class: `family-entry family-entry--${entry.role}`,
      style: `--depth: ${entry.depth}`,
      'data-family': entry.role,
    },
    h(
      'a',
      {
        class: 'row',
        href: entry.href,
        'aria-current': self ? 'true' : undefined,
        'aria-label': vs.openDrink(entry.name),
      },
      h(
        'span',
        { class: 'row-main' },
        h(
          'span',
          { class: 'row-title' },
          entry.name,
          self && h('span', { class: 'tag tag--strong tag--row' }, vs.thisDrink),
        ),
        h('span', { class: 'row-sub' }, entry.sub),
        entry.change &&
          h(
            'span',
            { class: 'row-change', 'data-family-change': '' },
            entry.change.count === 0
              ? entry.change.label
              : `${entry.change.label.charAt(0).toUpperCase()}${entry.change.label.slice(1)}: ${entry.change.text}`,
          ),
        entry.change?.figures && h('span', { class: 'row-sub num' }, entry.change.figures),
        entry.parentGone && h('span', { class: 'row-sub' }, vs.parentGone),
        entry.note && h('span', { class: 'row-sub' }, entry.note),
      ),
      h('span', { class: 'row-chevron' }, glyph.chevron()),
    ),
  );
}

function section(title: string, entries: FamilyEntry[], note?: string): HTMLElement {
  return h(
    'section',
    { class: 'family-group' },
    h('h2', { class: 'section-title' }, title),
    entries.length > 0 && h('ul', { class: 'family-list' }, ...entries.map(entryView)),
    note && h('p', { class: 'note' }, note),
  );
}

function body(vm: FamilyVM): HTMLElement {
  const tree = vm.entries.filter((e) => e.role !== 'sibling');
  const siblings = vm.entries.filter((e) => e.role === 'sibling');
  const hasChildren = tree.some((e) => e.role === 'child');
  return h(
    'div',
    { class: 'family' },
    vm.cycle && h('div', { class: 'banner banner--error', role: 'alert' }, h('span', {}, vm.cycle)),
    vm.empty
      ? h(
          'div',
          { class: 'status', 'data-family-empty': '' },
          h('p', {}, vs.noRelatives),
          h('a', { class: 'btn btn--primary', href: `${vm.entries[0]?.href}/riff` }, vs.riff),
        )
      : section(vs.familyTitle, tree, hasChildren ? undefined : vs.noRiffs),
    siblings.length > 0 && section(vs.siblings, siblings),
  );
}

export function familyView(context: ScreenContext, model: BrowseModel, id: string): ScreenView {
  const vm = familyVM(model, id, context.state.units);
  if (!vm) return notFound(context, strings.spec.notFoundTitle, strings.spec.notFoundText);
  return {
    title: vs.familyOf(vm.name),
    body: body(vm),
    actions: h(
      'a',
      {
        class: 'btn btn--primary',
        href: `#/drinks/${encodeURIComponent(id)}/riff`,
        'aria-label': vs.riffAria(vm.name),
        'data-focus': 'riff',
      },
      glyph.riff(),
      vs.riff,
    ),
    list: drinksPane(context, 'detail', id),
  };
}
