// The dish editor's form state (also the draft) and its translations to and from a record.
import type { ComponentRef } from '@culina/engine';
import type { DishRecord, SlotRecord, VersionInfo } from '../records';
import { appLang, withDecimalMark } from '../shared/locale';
import { parseEntry } from '../shared/parse';
import {
  isBlankStep,
  stepFormOf,
  stepProblemsOf,
  stepRecordOf,
  type StepForm,
} from './component-form';
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
  /** Names the slot for the assembly steps; kept from the record, given when a step first uses it. */
  key?: string;
}

export interface DishForm {
  id: string;
  isNew: boolean;
  name: string;
  portions: string;
  note: string;
  slots: SlotForm[];
  /** The assembly steps; a draft written before they existed has none. */
  steps?: StepForm[];
  version?: VersionInfo;
  /** Change, reason and tasting note for the version Save adds. */
  versionNote?: VersionNote;
}

export type DishProblem =
  | { code: 'name' }
  | { code: 'no-slots' }
  | { code: 'filling'; index: number }
  | { code: 'amount'; index: number }
  | { code: 'portions' }
  | { code: 'step'; index: number }
  | { code: 'step-number'; index: number };

export const newDishForm = (id: string): DishForm => ({
  id,
  isNew: true,
  name: '',
  portions: '2',
  note: '',
  slots: [],
  steps: [],
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
    amount: s.amount === undefined ? '' : withDecimalMark(String(s.amount.value), appLang),
    unit: (s.amount?.unit ?? 'g') as AmountUnit,
    ...(s.optional === true ? { optional: true } : {}),
    ...(s.key === undefined ? {} : { key: s.key }),
  })),
  steps: (dish.steps ?? []).map(stepFormOf),
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
  out.push(...stepProblemsOf(form.steps));
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
      ...(slot.key === undefined ? {} : { key: slot.key }),
    };
  });
  const keys = new Set(slots.flatMap((slot) => (slot.key === undefined ? [] : [slot.key])));
  const steps = (form.steps ?? [])
    .filter((step) => !isBlankStep(step))
    .map((step) => stepRecordOf(step, keys));
  const portions = wholePortions(form.portions);
  const note = form.note.trim();
  return {
    ok: true,
    record: {
      id: form.id,
      name: form.name.trim(),
      ...(portions === undefined ? {} : { portions }),
      slots,
      ...(steps.length === 0 ? {} : { steps }),
      version: form.version ?? { family: form.id, date: today },
      ...(note === '' ? {} : { note }),
    },
  };
};
