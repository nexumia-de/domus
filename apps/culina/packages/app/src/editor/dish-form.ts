// The dish editor's form state (also the draft) and its translations to and from a record.
import { COUNTRY_CODES, COURSE_IDS } from '@culina/engine';
import type { ComponentRef, Country, Course } from '@culina/engine';
import { normalCorrection, type StoredCorrection } from '../characters/correction';
import type { DishRecord, SlotRecord, VersionInfo } from '../records';
import { appLang, withDecimalMark } from '../shared/locale';
import { parseEntry } from '../shared/parse';
import {
  isBlankStep,
  stepFormOf,
  stepProblemsOf,
  stepRecordOf,
  vendorFields,
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
  /** A course id, or empty for not stated; a draft written before it existed has none. */
  course?: string;
  /** A country code, or empty for not stated. */
  cuisine?: string;
  /** The cook's correction of the characters, as the record stores it; absent for none. */
  characters?: StoredCorrection;
  note: string;
  slots: SlotForm[];
  /** The assembly steps; a draft written before they existed has none. */
  steps?: StepForm[];
  version?: VersionInfo;
  /** Change, reason and tasting note for the version Save adds. */
  versionNote?: VersionNote;
  /**
   * The record's vendor fields (`x-…`), which the form does not edit, kept as they are through a
   * save: `x-origin`, the shipped dish a copy was kept from, is a fact of the dish (a kept frame
   * stands among the frames by it). Absent when the record has none.
   */
  vendor?: Record<string, unknown>;
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
  course: '',
  cuisine: '',
  note: '',
  slots: [],
  steps: [],
});

export const dishFormFromRecord = (dish: DishRecord): DishForm => ({
  id: dish.id,
  isNew: false,
  name: dish.name,
  portions: dish.portions === undefined ? '' : String(dish.portions),
  course: dish.course ?? '',
  cuisine: dish.cuisine ?? '',
  ...(dish.characters === undefined ? {} : { characters: dish.characters }),
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
  ...(Object.keys(vendorFields(dish)).length === 0 ? {} : { vendor: vendorFields(dish) }),
});

/** A course the schema knows, else none: the select offers no other. */
export const asCourse = (value: string | undefined): Course | undefined =>
  COURSE_IDS.find((c) => c === value);

/** A cuisine the schema knows (a country code the app names), else none. */
export const asCuisine = (value: string | undefined): Country | undefined =>
  COUNTRY_CODES.find((c) => c === value);

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
  const course = asCourse(form.course);
  const cuisine = asCuisine(form.cuisine);
  const characters = normalCorrection(form.characters);
  return {
    ok: true,
    record: {
      // First, so that no field the form edits can be overwritten by one of them.
      ...vendorFields(form.vendor ?? {}),
      id: form.id,
      name: form.name.trim(),
      ...(portions === undefined ? {} : { portions }),
      ...(course === undefined ? {} : { course }),
      ...(cuisine === undefined ? {} : { cuisine }),
      ...(characters === undefined ? {} : { characters }),
      slots,
      ...(steps.length === 0 ? {} : { steps }),
      version: form.version ?? { family: form.id, date: today },
      ...(note === '' ? {} : { note }),
    },
  };
};
