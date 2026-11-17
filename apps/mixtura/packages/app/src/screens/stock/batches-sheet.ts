// The batches of one prepared ingredient as a sheet over Stock (#101): every
// batch at hand with its date and where it stands, Used up for one, and a date
// to add another. The user's own shelf life decides the states; the app
// proposes none. Every change acts at once with Undo. Address:
// `?sheet=batches&ing=<id>`.

import { limitingShelfLife } from '@mixtura/engine';
import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import { addBatch, batchDates, batchesOf, removeBatch } from '../../stock/batches';
import { changeStock, type StockRecords } from '../../stock/state';
import { today } from '../../today';
import { showToast } from '../../toast';
import type { BrowseModel } from '../browse/model';
import { shelfStrings } from '../spec/shelf-strings';
import { batchStrings as t } from './batch-strings';
import { statusText } from './batch-text';
import { datesNodes, shapeOf } from './near-date';
import { closeSheet, sheetIs, stockAddress, openSheet } from './sheet-address';

let dateDraft = '';
let problem: string | null = null;
let lastId = '';
let wasOpen = false;

const redraw = (context: ScreenContext): void =>
  context.store.set({ stockRev: context.store.get().stockRev + 1 });

export function openBatches(context: ScreenContext, id: string): void {
  dateDraft = '';
  problem = null;
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
      document.querySelector<HTMLElement>(`[data-focus="batches:${id}"]`)?.focus(),
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
  records: StockRecords,
  writable: boolean,
): HTMLElement | null {
  const id = context.route.query.get('ing') ?? '';
  const item = model.tree.byId.get(id);
  if (!sheetIs(context, 'batches') || !item?.prepared) return null;
  lastId = id;
  const day = today();
  const record = records.get(id);
  const batches = batchesOf(model.tree, model.preparedSpecs, id, record, day);

  const apply = (next: ReturnType<typeof addBatch>, text: string): void => {
    const undo = changeStock(context, [{ id, next }]);
    problem = null;
    if (undo.length > 0) showToast(context.store, text, () => changeStock(context, undo));
  };
  const add = (date: string): void => {
    const base = record ?? { ingredientId: id, present: false };
    if (date === '') problem = t.dateMissing;
    else if (date > day) problem = t.dateFuture;
    else if (batchDates(record).includes(date)) problem = t.already(date);
    else {
      dateDraft = '';
      return apply(addBatch(base, date), t.added(item.name, date));
    }
    redraw(context);
  };

  const dateInput = h('input', {
    type: 'date',
    class: 'input',
    id: 'batch-date',
    name: 'made-on',
    max: day,
    value: dateDraft,
    disabled: !writable,
    'data-focus': 'batch-date',
    ...(problem && { 'aria-invalid': 'true', 'aria-describedby': 'batch-problem' }),
    oninput: (event) => {
      dateDraft = (event.target as HTMLInputElement).value;
    },
  });
  const list =
    batches.length === 0
      ? h('p', { class: 'note' }, t.none)
      : h(
          'ul',
          { class: 'rows stock-batch-list', 'aria-label': t.listLabel },
          ...batches.map((batch) =>
            h(
              'li',
              { class: 'row stock-batch', 'data-batch': batch.madeOn },
              h(
                'span',
                { class: 'row-main' },
                h('span', { class: 'row-title num' }, ...datesNodes(batch)),
                h(
                  'span',
                  { class: 'shelf-state', 'data-batch-state': batch.status },
                  shapeOf(batch.status),
                  h('span', {}, statusText(batch)),
                ),
              ),
              h(
                'button',
                {
                  type: 'button',
                  class: 'btn',
                  disabled: !writable,
                  'aria-label': t.usedUpAria(batch.madeOn),
                  'data-focus': `used:${batch.madeOn}`,
                  onclick: () =>
                    apply(
                      removeBatch(record ?? { ingredientId: id, present: false }, batch.madeOn),
                      t.usedUpToast(item.name, batch.madeOn),
                    ),
                },
                t.usedUp,
              ),
            ),
          ),
        );

  const sheet = h(
    'div',
    {
      class: 'sheet batches-sheet',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': t.title(item.name),
      tabindex: '-1',
      'data-sheet': 'batches',
    },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', {}, t.title(item.name)),
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
      h('p', { class: 'note', 'data-shelf-life': '' }, shelfLine(model, id)),
      list,
      h(
        'div',
        { class: 'sheet-group' },
        h('h3', {}, t.addTitle),
        h('label', { for: 'batch-date' }, t.dateLabel),
        dateInput,
        problem && h('p', { class: 'field-error', role: 'alert', id: 'batch-problem' }, problem),
        h(
          'div',
          { class: 'btn-row' },
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn--primary',
              disabled: !writable,
              'data-focus': 'batch-add',
              onclick: () => add(dateInput.value),
            },
            t.add,
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'btn',
              disabled: !writable,
              'aria-label': t.madeTodayAria(item.name),
              'data-focus': 'batch-today',
              onclick: () => add(day),
            },
            t.madeToday,
          ),
        ),
        !writable && h('p', { class: 'note' }, t.readOnly),
      ),
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
