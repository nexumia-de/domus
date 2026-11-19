// The detail form of one stock item as data: from the stored record to field texts, and from
// field texts back to a record. The record is changed on a copy, so fields of another app stay;
// a field left empty is removed from the copy.
import type { Amount, FoodState, UnitId } from '@culina/engine';
import { AMOUNT_UNITS } from '../editor/units';
import { parseEntry } from '../shared/parse';
import type { StockRecord } from '../records';

export interface StockForm {
  amount: string;
  unit: UnitId;
  state: FoodState | '';
  always: boolean;
  preparedOn: string;
  useBy: string;
  note: string;
}

export const formOf = (item: StockRecord): StockForm => ({
  amount: item.amount === undefined ? '' : String(item.amount.value),
  unit: item.amount?.unit ?? 'g',
  state: item.state ?? '',
  always: item.always === true,
  preparedOn: item.preparedOn ?? '',
  useBy: item.useBy ?? '',
  note: item.note ?? '',
});

export type FormResult = { ok: true; record: StockRecord } | { ok: false; field: 'amount' };

const DETAIL = new Set(['amount', 'state', 'always', 'preparedOn', 'useBy', 'note']);

/** The record with the form's values; nothing else of it is touched. */
export const applyForm = (item: StockRecord, form: StockForm): FormResult => {
  const entry = parseEntry(form.amount);
  if (entry.kind === 'invalid') return { ok: false, field: 'amount' };
  const amount: Amount | undefined =
    entry.kind === 'ok' && AMOUNT_UNITS.includes(form.unit)
      ? { value: entry.value, unit: form.unit }
      : undefined;
  // Everything but the detail fields is carried over as it is, fields of other apps included.
  const kept = Object.entries(item).filter(([key]) => !DETAIL.has(key));
  const next = {
    ...Object.fromEntries(kept),
    ...(amount === undefined ? {} : { amount }),
    ...(form.state === '' ? {} : { state: form.state }),
    ...(form.always ? { always: true } : {}),
    ...(form.preparedOn === '' ? {} : { preparedOn: form.preparedOn }),
    ...(form.useBy === '' ? {} : { useBy: form.useBy }),
    ...(form.note.trim() === '' ? {} : { note: form.note.trim() }),
  } as StockRecord;
  return { ok: true, record: next };
};
