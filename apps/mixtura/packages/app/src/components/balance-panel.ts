// The balance panel: one block per figure (ABV, sugar, acid) with value,
// position word and shape, a track with the usual range as a band, then the
// volume, more figures, notes and the Details disclosure
// (docs/design.md#drawing-balance). Position is carried by the word, the
// arrow shape, the diamond's fill and its place on the track, never by colour.

import { h } from '../dom';
import { strings } from '../strings';
import type { BalanceVM, FigureVM } from '../screens/spec/balance-vm';
import * as glyph from './glyphs';

const POSITION_ICON = { within: glyph.within, below: glyph.below, above: glyph.above } as const;

function track(figure: FigureVM): HTMLElement | null {
  const geometry = figure.track;
  if (!geometry) return null;
  return h(
    'div',
    { class: 'track', role: 'img', 'aria-label': figure.label, title: figure.label },
    h('span', {
      class: figure.assumed ? 'band band--assumed' : 'band',
      style: `left: ${geometry.bandLeft.toFixed(1)}%; width: ${geometry.bandWidth.toFixed(1)}%`,
    }),
    geometry.markLeft !== undefined &&
      h('span', {
        class: geometry.within || figure.assumed ? 'mark' : 'mark mark--out',
        style: `left: ${geometry.markLeft.toFixed(1)}%`,
      }),
  );
}

function metric(figure: FigureVM): HTMLElement {
  const position =
    figure.status !== 'unknown' && figure.positionShort
      ? h(
          'span',
          { class: 'metric-state', title: strings.balance.positionFull[figure.status] },
          POSITION_ICON[figure.status](),
          figure.positionShort,
        )
      : null;
  return h(
    'div',
    { class: 'metric', role: 'group', 'aria-label': figure.name },
    h(
      'div',
      { class: 'metric-head' },
      h('span', { class: 'metric-name' }, figure.name),
      h(
        'span',
        { class: figure.known ? 'metric-value' : 'metric-value metric-value--none' },
        figure.valueText,
      ),
      position,
    ),
    track(figure),
    h('div', { class: 'metric-foot' }, h('span', {}, figure.footer)),
    figure.missing && h('p', { class: 'note metric-missing' }, figure.missing),
  );
}

export function balancePanel(vm: BalanceVM): HTMLElement {
  if (vm.failure) {
    return h(
      'section',
      { class: 'card', 'aria-labelledby': 'balance-title' },
      h('h2', { id: 'balance-title' }, vm.title),
      h('p', { class: 'note' }, vm.failure),
    );
  }
  return h(
    'section',
    { class: 'card balance', 'aria-labelledby': 'balance-title' },
    h('h2', { id: 'balance-title' }, vm.title),
    ...vm.figures.map(metric),
    vm.volume && h('div', { class: 'metric-foot metric-volume' }, h('span', {}, vm.volume)),
    h(
      'dl',
      { class: 'meta more' },
      ...vm.more.flatMap((row) => [
        h('dt', {}, row.label),
        h(
          'dd',
          {},
          row.value,
          row.missing && h('span', { class: 'note metric-missing' }, row.missing),
        ),
      ]),
    ),
    vm.notCounted.length > 0 &&
      h(
        'div',
        { class: 'not-counted', 'data-not-counted': '' },
        h('p', { class: 'note' }, strings.balance.notCountedLead),
        h(
          'ul',
          { 'aria-label': strings.balance.notCounted },
          ...vm.notCounted.map((text) => h('li', {}, text)),
        ),
      ),
    ...vm.notes.map((text) => h('p', { class: 'note' }, text)),
    vm.unverified && h('p', { class: 'note', 'data-unverified': '' }, vm.unverified),
    h(
      'details',
      { class: 'disclosure' },
      h('summary', { 'aria-label': strings.balance.detailsAria }, strings.balance.detailsLabel),
      h('h3', {}, strings.balance.howTitle),
      h('ul', {}, ...vm.details.map((text) => h('li', {}, text))),
    ),
  );
}
