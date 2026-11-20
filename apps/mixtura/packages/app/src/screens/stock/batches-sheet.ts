// The batches of one prepared ingredient, or with several spaces counting the spaces of any ingredient, as a sheet over Stock (#101, #131): every
// batch at hand with its date and where it stands, Used up for one, and a date
// to add another. The user's own shelf life decides the states; the app
// proposes none. Every change acts at once with Undo. Address:
// `?sheet=batches&ing=<id>`.

import { limitingShelfLife } from '@mixtura/engine';
import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import { strings } from '../../strings';
import { spaceBlocks } from '../../stock/spaces-view';
import { type StockState } from '../../stock/state';
import { today } from '../../today';
import type { BrowseModel } from '../browse/model';
import { shelfStrings } from '../spec/shelf-strings';
import { batchStrings as t } from './batch-strings';
import { batchBlock, resetBlocks } from './batches-block';
import { closeSheet, sheetIs, stockAddress, openSheet } from './sheet-address';

let lastId = '';
let openedFrom: 'batches' | 'spaces' = 'batches';
let wasOpen = false;

export function openBatches(
  context: ScreenContext,
  id: string,
  from: 'batches' | 'spaces' = 'batches',
): void {
  openedFrom = from;
  resetBlocks();
  lastId = id;
  openSheet(context, stockAddress(context, 'batches', { ing: id }));
}

/** After a redraw: the sheet takes the focus when it opens and gives it back to its opener when it closes. */
export function batchesFocus(context: ScreenContext, body: HTMLElement): void {
  const open = sheetIs(context, 'batches');
  if (open && !wasOpen) {
    requestAnimationFrame(() => body.querySelector<HTMLElement>('[data-sheet]')?.focus());
  } else if (!open && wasOpen) {
    const id = lastId;
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-focus="${openedFrom}:${id}"]`)?.focus(),
    );
  }
  wasOpen = open;
}

function shelfLine(model: BrowseModel, id: string): string {
  const limit = limitingShelfLife(model.tree, model.preparedSpecs, id);
  if (!limit.known) return shelfStrings.noShelfLife;
  const line = shelfStrings.shelfLife(limit.days);
  return limit.limitingId === id
    ? line
    : `${line}, ${shelfStrings.limitedBy(model.ingredientName(limit.limitingId) ?? limit.limitingId)}`;
}

export function batchesSheet(
  context: ScreenContext,
  model: BrowseModel,
  state: Extract<StockState, { kind: 'ready' }>,
): HTMLElement | null {
  const id = context.route.query.get('ing') ?? '';
  const item = model.tree.byId.get(id);
  if (!sheetIs(context, 'batches') || !item) return null;
  const { writable, selection, bySpace } = state;
  const blocks = spaceBlocks(bySpace, selection.ticked, selection.spaces, id);
  // Any ingredient has this sheet when several spaces count (the way to change another space's
  // record); only a prepared one has it with a single space.
  const prepared = item.prepared !== undefined;
  if (!prepared && blocks.length < 2) return null;
  lastId = id;
  const title = blocks.length > 1 ? strings.spaces.sheetTitle(item.name) : t.title(item.name);
  const shared = {
    context,
    model,
    id,
    name: item.name,
    day: today(),
    writable,
    multi: blocks.length > 1,
    prepared,
  };

  const sheet = h(
    'div',
    {
      class: 'sheet batches-sheet',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': title,
      tabindex: '-1',
      'data-sheet': 'batches',
    },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, title),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--icon',
          'aria-label': t.close,
          title: t.close,
          'data-focus': 'back',
          onclick: () => closeSheet(context),
        },
        glyph.close(),
      ),
    ),
    h(
      'div',
      { class: 'sheet-scroll' },
      prepared && h('p', { class: 'note', 'data-shelf-life': '' }, shelfLine(model, id)),
      ...blocks.map((block) => batchBlock(shared, block)),
      !writable && h('p', { class: 'note' }, t.readOnly),
    ),
  );
  sheet.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    closeSheet(context);
  });
  return h(
    'div',
    {
      class: 'sheet-backdrop sheet-backdrop--fixed',
      onclick: (event) => {
        if (event.target === event.currentTarget) closeSheet(context);
      },
    },
    sheet,
  );
}
