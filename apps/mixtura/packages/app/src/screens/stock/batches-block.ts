// One place's part of the batches sheet (#101, #131): its batches with Used
// up, a date to add another, and with several places counting its own state
// (in stock, out, not tracked) with a toggle. Every change acts at once with
// Undo and goes to this block's place.

import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import { addBatch, batchDates, batchesOf, removeBatch } from '../../stock/batches';
import { type PlaceBlock } from '../../stock/places-view';
import { changeStock, withPresent } from '../../stock/state';
import { strings } from '../../strings';
import { showToast } from '../../toast';
import type { BrowseModel } from '../browse/model';
import { batchStrings as t } from './batch-strings';
import { statusText } from './batch-text';
import { datesNodes, shapeOf } from './near-date';

const drafts = new Map<string, string>();
const problems = new Map<string, string>();

/** A new sheet starts without typed dates or messages. */
export function resetBlocks(): void {
  drafts.clear();
  problems.clear();
}

export interface BlockContext {
  context: ScreenContext;
  model: BrowseModel;
  id: string;
  name: string;
  day: string;
  writable: boolean;
  /** More than one place counts: the block says whose it is and has its own toggle. */
  multi: boolean;
  /** A prepared ingredient has batches; another ingredient only its state and what is recorded. */
  prepared: boolean;
}

const redraw = (context: ScreenContext): void =>
  context.store.set({ stockRev: context.store.get().stockRev + 1 });

const stateWord = (state: PlaceBlock['state']): string =>
  state === 'in'
    ? strings.stock.inStock
    : state === 'out'
      ? strings.stock.out
      : strings.stock.notTracked;

export function batchBlock(c: BlockContext, block: PlaceBlock): HTMLElement {
  const { context, model, id, name, day, writable, multi, prepared } = c;
  const { placeId, record } = block;
  const at = multi ? `-${placeId}` : '';
  const problem = problems.get(placeId) ?? null;
  const base = record ?? { ingredientId: id, present: false };
  const batches = batchesOf(model.tree, model.preparedSpecs, id, record, day);

  const apply = (next: ReturnType<typeof addBatch>, text: string): void => {
    const undo = changeStock(context, [{ id, placeId, next }]);
    problems.delete(placeId);
    if (undo.length > 0) showToast(context.store, text, () => changeStock(context, undo));
  };
  const add = (date: string): void => {
    if (date === '') problems.set(placeId, t.dateMissing);
    else if (date > day) problems.set(placeId, t.dateFuture);
    else if (batchDates(record).includes(date)) problems.set(placeId, t.already(date));
    else {
      drafts.delete(placeId);
      return apply(addBatch(base, date), t.added(name, date));
    }
    redraw(context);
  };

  const dateInput = h('input', {
    type: 'date',
    class: 'input',
    id: `batch-date${at}`,
    name: 'made-on',
    max: day,
    value: drafts.get(placeId) ?? '',
    disabled: !writable,
    'data-focus': `batch-date${at}`,
    ...(problem && { 'aria-invalid': 'true', 'aria-describedby': `batch-problem${at}` }),
    oninput: (event) => {
      drafts.set(placeId, (event.target as HTMLInputElement).value);
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
                  'data-focus': `used:${batch.madeOn}${at}`,
                  onclick: () =>
                    apply(removeBatch(base, batch.madeOn), t.usedUpToast(name, batch.madeOn)),
                },
                t.usedUp,
              ),
            ),
          ),
        );
  const present = block.state === 'in';
  const toggle = multi
    ? h(
        'button',
        {
          type: 'button',
          role: 'checkbox',
          class: 'stock-toggle place-state',
          'aria-checked': present ? 'true' : 'false',
          'aria-label': strings.places.stateIn(block.name),
          'aria-disabled': writable ? undefined : 'true',
          'data-place-state': placeId,
          'data-focus': `place-state${at}`,
          onclick: () => {
            if (!writable) return;
            const text = present ? strings.stock.markedOut(name) : strings.stock.marked(name);
            apply(withPresent(new Map(record ? [[id, record]] : []), id, !present), text);
          },
        },
        h(
          'span',
          { class: `check${present ? ' on' : ''}`, 'aria-hidden': 'true' },
          present && glyph.check(),
        ),
        h('span', { class: 'row-main' }, h('span', { class: 'row-title' }, stateWord(block.state))),
      )
    : null;

  const recorded = [
    record?.openedOn && strings.places.opened(record.openedOn),
    record?.bestBefore && strings.places.bestBefore(record.bestBefore),
  ].filter((text): text is string => typeof text === 'string' && text !== '');
  return h(
    'div',
    { class: multi ? 'place-block' : 'sheet-group', 'data-place-block': placeId },
    multi && h('h3', {}, block.name),
    toggle,
    !prepared && recorded.length > 0 && h('p', { class: 'note' }, recorded.join(' · ')),
    multi && record?.note && h('p', { class: 'note' }, record.note),
    prepared && list,
    prepared &&
      h(
        'div',
        { class: 'sheet-group' },
        h('h3', {}, t.addTitle),
        h('label', { for: `batch-date${at}` }, t.dateLabel),
        dateInput,
        problem &&
          h('p', { class: 'field-error', role: 'alert', id: `batch-problem${at}` }, problem),
        h(
          'div',
          { class: 'btn-row' },
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn--primary',
              disabled: !writable,
              'data-focus': `batch-add${at}`,
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
              'aria-label': t.madeTodayAria(name),
              'data-focus': `batch-today${at}`,
              onclick: () => add(day),
            },
            t.madeToday,
          ),
        ),
      ),
  );
}
