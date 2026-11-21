// The Buy Next view: which one ingredient makes the most drinks possible
// (docs/screens-stock-settings.md#buy-next). The mode and the open
// candidate live in the address; the ranking is the engine's, derived.

import type { SpecStatus } from '@mixtura/engine';
import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import { replace } from '../../navigation';
import { formatHash } from '../../router';
import { type ScreenContext, type ScreenView } from '../../screen';
import { deriveStock, hasStock } from '../../stock/derived';
import { rankedStock } from '../../stock/rank-async';
import { changeStock, stockState, withPresent } from '../../stock/state';
import { listKey } from '../../shell/scroll';
import { strings } from '../../strings';
import { say } from '../../shell/frame';
import { browseState } from '../browse/load';
import { failedStatus, loadingStatus } from '../drinks/pane';
import { incrementalRows } from '../drinks/rows';
import { status } from '../status';
import { candidatesOf, type Candidate } from './buy-next-model';
import { views } from './views';

const PREVIEW = 3;

function hashFor(strict: boolean | null, open: string | null): string {
  const query = new URLSearchParams();
  if (strict !== null) query.set('strict', strict ? '1' : '0');
  if (open) query.set('open', open);
  return formatHash(['stock', 'buy-next'], query);
}

export function buyNextView(context: ScreenContext): ScreenView {
  const title = strings.titles.buyNext;
  const browse = browseState(context);
  const state = stockState(context);
  if (browse.kind !== 'ready' || state.kind !== 'ready') {
    const body = browse.kind === 'failed' ? failedStatus(browse.reason) : loadingStatus();
    return { title, body: h('div', { class: 'stack' }, views('buy-next'), body) };
  }
  const { model } = browse;
  const { records, entryRecords, writable } = state;
  // The address decides when it names a mode; otherwise the remembered one.
  const named = context.route.query.get('strict');
  const strict = named === null ? context.state.buyNextMode === 'strict' : named === '1';
  const excludeStatuses: SpecStatus[] = [
    ...(context.state.buyNextDrafts === 'no' ? (['draft'] as const) : []),
    ...(context.state.buyNextRetired === 'no' ? (['retired'] as const) : []),
  ];
  const open = context.route.query.get('open');
  const stocked = hasStock(model, records);
  // The ranking comes from a worker; the previous one is drawn until the new one is in.
  const ranked = rankedStock(
    model,
    records,
    strict ? 'strict' : 'with-substitutes',
    excludeStatuses,
    () => context.store.set({ rankRev: context.store.get().rankRev + 1 }),
  );
  const shown = ranked.result ?? ranked.previous;
  if (!shown)
    return { title, body: h('div', { class: 'stack' }, views('buy-next'), loadingStatus()) };
  const ranking = candidatesOf(model, shown);
  // Switching the mode is remembered and the address then names none; opening a row keeps
  // what the address said.
  const setView = (nextStrict: boolean, nextOpen: string | null): void => {
    const switched = nextStrict !== strict;
    if (switched) {
      context.store.set({ buyNextMode: nextStrict ? 'strict' : 'with-substitutes' });
    }
    replace(context.store, hashFor(!switched && named !== null ? strict : null, nextOpen));
  };

  const haveIt = (c: Candidate): void => {
    const undo = changeStock(context, [{ id: c.id, next: withPresent(entryRecords, c.id, true) }]);
    if (undo.length > 0) {
      say(strings.buyNext.added(c.name), () => changeStock(context, undo));
    }
  };

  const row = (c: Candidate, rank: number): HTMLElement => {
    const isOpen = open === c.id;
    const preview = c.drinks.slice(0, PREVIEW).map((d) => d.name);
    const rest = c.drinks.length - preview.length;
    const label = (isOpen ? strings.buyNext.hideDrinks : strings.buyNext.showDrinks)(c.name);
    return h(
      'li',
      { class: 'buy-item', 'data-candidate': c.id },
      h(
        'div',
        { class: 'row buy-row' },
        h('span', { class: 'buy-rank num', 'aria-hidden': 'true' }, strings.buyNext.rank(rank)),
        h(
          'button',
          {
            class: 'buy-main',
            type: 'button',
            'aria-expanded': isOpen ? 'true' : 'false',
            'aria-label': `${c.name}. ${strings.buyNext.unlocks(c.count)}. ${label}`,
            'data-focus': `buy:${c.id}`,
            onclick: () => setView(strict, isOpen ? null : c.id),
          },
          h('span', { class: 'row-title' }, c.name),
          h(
            'span',
            { class: 'buy-unlocks' },
            strings.buyNext.unlocks(c.count),
            c.substituted > 0 && ` · ${strings.buyNext.substituteOnly(c.substituted)}`,
          ),
          h(
            'span',
            { class: 'row-sub' },
            [...preview, rest > 0 ? strings.buyNext.more(rest) : ''].filter(Boolean).join(', '),
          ),
          h(
            'span',
            { class: 'tag buy-kind' },
            c.kind === 'type' ? strings.buyNext.kindType : strings.buyNext.kindProduct,
          ),
          c.alsoBy.length > 0 &&
            h(
              'span',
              { class: 'row-sub' },
              strings.buyNext.alsoBy(
                c.name,
                c.alsoBy.slice(0, PREVIEW).join(', '),
                c.alsoBy.length - PREVIEW,
              ),
            ),
        ),
        h(
          'button',
          {
            class: 'btn btn--tonal buy-have',
            type: 'button',
            disabled: !writable,
            'aria-label': strings.buyNext.haveItName(c.name),
            onclick: () => haveIt(c),
          },
          strings.buyNext.haveIt,
        ),
      ),
      isOpen &&
        h(
          'ul',
          { class: 'rows buy-drinks' },
          ...c.drinks.map((d) =>
            h(
              'li',
              {},
              h(
                'a',
                { class: 'row', href: formatHash(['drinks', d.lineageId]) },
                h('span', { class: 'row-main' }, h('span', { class: 'row-title' }, d.name)),
                glyph.chevron(),
              ),
            ),
          ),
        ),
    );
  };

  const modeBox = h(
    'button',
    {
      class: 'row stock-toggle buy-mode',
      type: 'button',
      role: 'checkbox',
      'aria-checked': strict ? 'false' : 'true',
      'data-focus': 'buy-mode',
      onclick: () => setView(!strict, open),
    },
    h(
      'span',
      { class: `check${strict ? '' : ' on'}`, 'aria-hidden': 'true' },
      !strict && glyph.check(),
    ),
    h(
      'span',
      { class: 'row-main' },
      h('span', { class: 'row-title buy-wrap' }, strings.buyNext.substitutes),
    ),
  );

  let list: Node[];
  if (ranking.length > 0) {
    list = incrementalRows(
      ranking.map((c, i) => ({ c, rank: i + 1 })),
      listKey(context.route),
      (e) => row(e.c, e.rank),
    );
    list.forEach((el) => el instanceof HTMLUListElement && el.classList.add('buy-list'));
  } else {
    const allMade = stocked && deriveStock(model, records).counts.makeable === model.drinks.length;
    list = [status(allMade ? strings.empty.buyNextAll : strings.empty.buyNextNothing)];
  }

  const body = h(
    'div',
    { class: 'stack buy-screen' },
    views('buy-next'),
    modeBox,
    h('p', { class: 'note' }, strings.buyNext.explain),
    !stocked && h('p', { class: 'note buy-empty' }, strings.empty.buyNext),
    ...list,
  );
  return { title, body };
}
