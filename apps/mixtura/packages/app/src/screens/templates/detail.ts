// Template detail: slots with their ratio ranges, method and glass, the usual
// ranges drawn as bands with the numbers and their basis, and the drinks that
// follow the template (docs/screens-browse.md#template-detail).

import * as glyph from '../../components/glyphs';
import { specMeta } from '../../components/spec-lines';
import { h } from '../../dom';
import { strings } from '../../strings';
import type { BrowseModel } from '../browse/model';
import type { Template } from '../browse/types';
import { drinkRow } from '../drinks/row';
import { incrementalRows } from '../drinks/rows';
import { specHash } from '../drinks/url';
import { status } from '../status';
import { templateVM, type RangeVM, type TemplateVM } from './view-model';

function slots(vm: TemplateVM): HTMLElement {
  return h(
    'section',
    { class: 'card', 'aria-labelledby': 'slots-title' },
    h('h2', { id: 'slots-title' }, strings.templates.slots),
    h(
      'table',
      { class: 'slots' },
      h(
        'thead',
        {},
        h(
          'tr',
          {},
          h('th', { scope: 'col' }, strings.templates.slotRole),
          h('th', { scope: 'col' }, strings.templates.slotParts),
          h('th', { scope: 'col' }, ''),
        ),
      ),
      h(
        'tbody',
        {},
        ...vm.slots.map((slot) =>
          h(
            'tr',
            {},
            h('td', {}, h('span', { class: 'tag' }, slot.role)),
            h('td', { class: 'num' }, slot.parts),
            h(
              'td',
              { class: 'slot-note' },
              [slot.optional ? strings.templates.optional : '', slot.note ?? '']
                .filter(Boolean)
                .join(', '),
            ),
          ),
        ),
      ),
    ),
    specMeta(vm.meta),
  );
}

function range(vm: RangeVM): HTMLElement {
  return h(
    'div',
    { class: 'metric', role: 'group', 'aria-label': vm.name },
    h('div', { class: 'metric-head' }, h('span', { class: 'metric-name' }, vm.name)),
    h(
      'div',
      { class: 'track', role: 'img', 'aria-label': vm.label, title: vm.label },
      h('span', {
        class: 'band',
        style: `left: ${vm.track.bandLeft.toFixed(1)}%; width: ${vm.track.bandWidth.toFixed(1)}%`,
      }),
    ),
    h('div', { class: 'metric-foot' }, h('span', {}, vm.text)),
  );
}

function ranges(vm: TemplateVM): HTMLElement {
  return h(
    'section',
    { class: 'card', 'aria-labelledby': 'ranges-title' },
    h('h2', { id: 'ranges-title' }, strings.templates.usualRanges),
    vm.ranges.length === 0
      ? h('p', { class: 'note' }, strings.templates.noRanges)
      : h('div', { class: 'stack' }, ...vm.ranges.map(range)),
    ...vm.basis.map((text) => h('p', { class: 'note' }, text)),
  );
}

export function templateBody(model: BrowseModel, template: Template): HTMLElement {
  const vm = templateVM(model, template);
  const drinks = model.drinks.filter((d) => d.spec.templateId === template.id);
  return h(
    'div',
    { class: 'spec' },
    vm.parent &&
      h(
        'div',
        { class: 'tags' },
        h(
          'a',
          { class: 'tag tag--link', href: `#/templates/${encodeURIComponent(vm.parent.id)}` },
          strings.templates.variantOf(vm.parent.name),
        ),
      ),
    h('div', { class: 'two-col' }, slots(vm), ranges(vm)),
    vm.notes && h('section', { class: 'card' }, h('p', { class: 'spec-notes' }, vm.notes)),
    h(
      'section',
      { class: 'card card--flush', 'aria-labelledby': 'follow-title' },
      h('h2', { id: 'follow-title', class: 'card-title' }, strings.templates.drinks),
      drinks.length === 0
        ? status(strings.templates.noDrinks)
        : h(
            'div',
            { class: 'list-flush' },
            ...incrementalRows(drinks, `template:${template.id}`, (drink) =>
              drinkRow(model, drink, specHash(drink.spec.lineageId, { q: '' }), false),
            ),
          ),
    ),
  );
}

/** The bottom bar: the drinks list filtered to this template. */
export function templateActions(template: Template): HTMLElement {
  return h(
    'a',
    {
      class: 'btn btn--primary',
      href: `#/drinks?template=${encodeURIComponent(template.id)}`,
    },
    glyph.chevron(),
    strings.templates.showInDrinks,
  );
}
