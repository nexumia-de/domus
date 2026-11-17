// The filters sheet over the drinks list (docs/screens-browse.md#filters):
// groups of chips, one tap each, a check mark and bold when on; a bottom bar
// with Clear Filters and Show N Drinks, the count live. Nothing is stored:
// every tap rewrites the address.

import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import type { AlcoholThresholds } from '@mixtura/engine';
import type { Derived } from '../../stock/derived';
import { strings } from '../../strings';
import {
  activeFilters,
  withFilter,
  withoutFilters,
  type FilterKey,
  type Filters,
} from '../browse/filters';
import { tallyAlcohol } from '../browse/alcohol';
import type { BrowseModel, Option } from '../browse/model';
import { STRENGTH_BANDS } from '../browse/strength';

export interface SheetActions {
  /** Applies these filters (the sheet stays open). */
  apply(filters: Filters): void;
  /** Closes the sheet, keeping the filters. */
  close(): void;
}

interface Choice {
  id: string;
  label: string;
}

function groups(
  model: BrowseModel,
  stock: Derived | undefined,
  thresholds: AlcoholThresholds,
): { key: FilterKey; title: string; choices: Choice[]; hint?: string; disabled?: boolean }[] {
  const counts = model.templateCounts();
  const withCount = (name: string, count: number): string => `${name} (${count})`;
  const templates = [...model.templates]
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
    .map((t) => ({ id: t.id, label: withCount(t.name, counts.get(t.id) ?? 0) }));
  const options = (list: readonly Option[]): Choice[] =>
    list.map((o) => ({ id: o.id, label: withCount(o.name, o.count) }));
  const withoutAbv = model.withoutAbv();
  const words = strings.browse.availability;
  const empty = !stock || stock.states.size === 0;
  const n = stock?.counts;
  return [
    {
      key: 'makeable',
      title: strings.browse.groups.makeable,
      choices: [
        { id: 'yes', label: withCount(words.yes, n?.makeable ?? 0) },
        { id: 'substitute', label: withCount(words.substitute, n?.substitute ?? 0) },
        { id: 'one', label: withCount(words.one, n?.one ?? 0) },
      ],
      disabled: empty,
      hint: empty ? words.markStockFirst : undefined,
    },
    {
      key: 'alcohol',
      title: strings.browse.groups.alcohol,
      choices: [
        { id: 'none', label: strings.browse.alcohol.none },
        { id: 'low', label: strings.browse.alcohol.low },
      ],
      hint: alcoholHint(model, thresholds),
    },
    { key: 'template', title: strings.browse.groups.template, choices: templates },
    { key: 'method', title: strings.browse.groups.method, choices: options(model.methodOptions()) },
    { key: 'base', title: strings.browse.groups.base, choices: options(model.baseOptions()) },
    {
      key: 'strength',
      title: strings.browse.groups.strength,
      choices: STRENGTH_BANDS.map((b) => ({ id: b.id, label: b.label })),
      hint: [
        strings.browse.strengthHint,
        withoutAbv > 0 ? strings.browse.strengthUnknown(withoutAbv) : '',
      ]
        .filter(Boolean)
        .join(' '),
    },
  ];
}

function alcoholHint(model: BrowseModel, t: AlcoholThresholds): string {
  const a = strings.browse.alcohol;
  const without =
    t.withoutBound === 'upTo' && t.withoutPct === 0
      ? 'exactly 0 %'
      : `${t.withoutBound === 'below' ? 'below' : 'up to'} ${t.withoutPct} %`;
  const tally = tallyAlcohol(model, model.drinks, t);
  return `${a.hint(without, `up to ${t.lowPct} %`)} ${a.tally(tally.none, tally.low, tally.unknown)}`;
}

function chip(label: string, on: boolean, toggle: () => void, disabled = false): HTMLElement {
  return h(
    'button',
    {
      class: 'chip',
      type: 'button',
      'aria-pressed': on ? 'true' : 'false',
      disabled,
      onclick: toggle,
    },
    on && glyph.check(),
    label,
  );
}

export function filtersSheet(
  model: BrowseModel,
  filters: Filters,
  count: number,
  stock: Derived | undefined,
  thresholds: AlcoholThresholds,
  actions: SheetActions,
): HTMLElement {
  const active = activeFilters(filters).length > 0;
  const groupEls = groups(model, stock, thresholds).map((group) =>
    h(
      'section',
      { class: 'sheet-group', 'aria-label': group.title },
      h('h3', {}, group.title),
      h(
        'div',
        { class: 'chips' },
        ...group.choices.map((choice) =>
          chip(
            choice.label,
            filters[group.key] === choice.id,
            () => {
              const on = filters[group.key] === choice.id;
              actions.apply(withFilter(filters, group.key, on ? undefined : choice.id));
            },
            group.disabled === true && filters[group.key] !== choice.id,
          ),
        ),
      ),
      group.hint && h('p', { class: 'note' }, group.hint),
    ),
  );
  const clear = (): void => actions.apply(withoutFilters(filters));
  const sheet = h(
    'div',
    {
      class: 'sheet',
      role: 'dialog',
      'aria-label': strings.browse.filters,
      'aria-modal': 'true',
      tabindex: '-1',
      'data-sheet': '',
    },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, strings.browse.filters),
      h(
        'button',
        {
          class: 'btn btn--icon',
          type: 'button',
          'aria-label': strings.browse.closeFilters,
          title: strings.browse.closeFilters,
          'data-focus': 'back',
          onclick: actions.close,
        },
        glyph.close(),
      ),
    ),
    h('div', { class: 'sheet-scroll' }, ...groupEls),
    h(
      'div',
      { class: 'sheet-bar' },
      h(
        'button',
        { class: 'btn', type: 'button', disabled: !active, onclick: clear },
        strings.browse.clearFilters,
      ),
      h(
        'button',
        {
          class: 'btn btn--primary',
          type: 'button',
          disabled: count === 0,
          onclick: actions.close,
        },
        strings.browse.showDrinks(count),
      ),
    ),
  );
  return h(
    'div',
    {
      class: 'sheet-backdrop',
      onclick: (event) => {
        if (event.target === event.currentTarget) actions.close();
      },
    },
    sheet,
  );
}
