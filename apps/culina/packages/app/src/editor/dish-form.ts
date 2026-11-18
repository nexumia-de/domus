// The dish editor's form state (also the draft) and its translations to and from a record.
import type { ComponentRef } from '@culina/engine';
import type { DishRecord, SlotRecord, VersionInfo } from '../records';
import { parseEntry } from '../shared/parse';
import type { VersionNote } from './version-save';
import type { AmountUnit } from './units';

export interface SlotForm {
  role: string;
  /** Undefined while the filling is still to be chosen (kept in the draft only). */
  ref?: ComponentRef;
  /** Per portion, as typed; empty for no amount. */
  amount: string;
  unit: AmountUnit;
  optional?: boolean;
}

export interface DishForm {
  id: string;
  isNew: boolean;
  name: string;
  portions: string;
  note: string;
  slots: SlotForm[];
  version?: VersionInfo;
  /** Change, reason and tasting note for the version Save adds. */
  versionNote?: VersionNote;
}

export type DishProblem =
  | { code: 'name' }
  | { code: 'no-slots' }
  | { code: 'filling'; index: number }
  | { code: 'amount'; index: number }
  | { code: 'portions' };

export const newDishForm = (id: string): DishForm => ({
  id,
  isNew: true,
  name: '',
  portions: '2',
  note: '',
  slots: [],
});

export const dishFormFromRecord = (dish: DishRecord): DishForm => ({
  id: dish.id,
  isNew: false,
  name: dish.name,
  portions: dish.portions === undefined ? '' : String(dish.portions),
  note: dish.note ?? '',
  slots: dish.slots.map((s) => ({
    role: s.role,
    ref: s.ref,
    amount: s.amount === undefined ? '' : String(s.amount.value),
    unit: (s.amount?.unit ?? 'g') as AmountUnit,
    ...(s.optional === true ? { optional: true } : {}),
  })),
  version: dish.version,
});

const wholePortions = (text: string): number | undefined => {
  const entry = parseEntry(text);
  return entry.kind === 'ok' && Number.isInteger(entry.value) ? entry.value : undefined;
};

export const dishProblems = (form: DishForm): DishProblem[] => {
  const out: DishProblem[] = [];
  if (form.name.trim() === '') out.push({ code: 'name' });
  if (form.slots.length === 0) out.push({ code: 'no-slots' });
  if (form.portions.trim() !== '' && wholePortions(form.portions) === undefined) {
    out.push({ code: 'portions' });
  }
  form.slots.forEach((slot, index) => {
    if (slot.ref === undefined) out.push({ code: 'filling', index });
    if (parseEntry(slot.amount).kind === 'invalid') out.push({ code: 'amount', index });
  });
  return out;
};

export type DishResult = { ok: true; record: DishRecord } | { ok: false; problems: DishProblem[] };

export const dishFormToRecord = (form: DishForm, today: string): DishResult => {
  const problems = dishProblems(form);
  if (problems.length > 0) return { ok: false, problems };
  const slots = form.slots.map((slot): SlotRecord => {
    const entry = parseEntry(slot.amount);
    return {
      role: slot.role,
      ref: slot.ref as ComponentRef,
      ...(entry.kind === 'ok' ? { amount: { value: entry.value, unit: slot.unit } } : {}),
      ...(slot.optional === true ? { optional: true } : {}),
    };
  });
  const portions = wholePortions(form.portions);
  const note = form.note.trim();
  return {
    ok: true,
    record: {
      id: form.id,
      name: form.name.trim(),
      ...(portions === undefined ? {} : { portions }),
      slots,
      version: form.version ?? { family: form.id, date: today },
      ...(note === '' ? {} : { note }),
    },
  };
};
