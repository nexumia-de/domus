// The component editor's form state (plain JSON, so it is also the draft) and its two
// translations: from a stored record to the form, and from the form to a record.
import type { ComponentLine, ComponentRef, FoodState } from '@culina/engine';
import type { ComponentRecord, VersionInfo } from '../records';
import { parseEntry } from '../shared/parse';
import type { EntryUnit, MassUnit } from './units';

export interface LineForm {
  /** Undefined while the ingredient is still to be picked (kept in the draft only). */
  ref?: ComponentRef;
  /** As typed; empty means no amount ("to taste"). */
  amount: string;
  unit: EntryUnit;
  role?: string;
  state?: FoodState;
  note?: string;
}

export interface ComponentForm {
  id: string;
  /** False when a record with this id is stored. */
  isNew: boolean;
  name: string;
  /** The dish role it usually fills; empty for none. */
  role: string;
  templateId?: string;
  /** The role whose mass is 100 %. */
  percentBase?: string;
  /** How the amounts are entered now. `percent` without `percentBase` still holds weights. */
  entry: 'weight' | 'percent';
  lines: LineForm[];
  yieldAmount: string;
  yieldUnit: MassUnit;
  /** Kept from the record until the yield is edited. */
  yieldSource?: string;
  /** One step or note per line. */
  method: string;
  version?: VersionInfo;
}

export type Problem =
  | { code: 'name' }
  | { code: 'no-lines' }
  | { code: 'ingredient'; index: number }
  | { code: 'amount'; index: number }
  | { code: 'yield' }
  | { code: 'cycle' };

export const newComponentForm = (id: string): ComponentForm => ({
  id,
  isNew: true,
  name: '',
  role: '',
  entry: 'weight',
  lines: [],
  yieldAmount: '',
  yieldUnit: 'g',
  method: '',
});

const text = (n: number): string => String(n);

export const formFromRecord = (record: ComponentRecord): ComponentForm => ({
  id: record.id,
  isNew: false,
  name: record.name,
  role: record.role ?? '',
  ...(record.templateId === undefined ? {} : { templateId: record.templateId }),
  ...(record.percentBase === undefined ? {} : { percentBase: record.percentBase }),
  entry: record.lines.some((l) => l.amount?.unit === 'percent') ? 'percent' : 'weight',
  lines: record.lines.map((line) => ({
    ref: line.ref,
    amount: line.amount === undefined ? '' : text(line.amount.value),
    unit: line.amount?.unit ?? 'g',
    ...(line.role === undefined ? {} : { role: line.role }),
    ...(line.state === undefined ? {} : { state: line.state }),
    ...(line.note === undefined ? {} : { note: line.note }),
  })),
  yieldAmount: record.yield === undefined ? '' : text(record.yield.amount.value),
  yieldUnit: record.yield?.amount.unit ?? 'g',
  ...(record.yield === undefined ? {} : { yieldSource: record.yield.source }),
  method: (record.method ?? []).join('\n'),
  version: record.version,
});

/** The line as the engine reads it: an amount only when the typed text is a number above 0. */
export const engineLine = (line: LineForm): ComponentLine => {
  const entry = parseEntry(line.amount);
  return {
    ref: line.ref ?? { kind: 'ingredient', id: 'unpicked' },
    ...(entry.kind === 'ok' ? { amount: { value: entry.value, unit: line.unit } } : {}),
    ...(line.role === undefined ? {} : { role: line.role }),
    ...(line.state === undefined ? {} : { state: line.state }),
  };
};

export const problemsOf = (form: ComponentForm): Problem[] => {
  const out: Problem[] = [];
  if (form.name.trim() === '') out.push({ code: 'name' });
  if (form.lines.length === 0) out.push({ code: 'no-lines' });
  form.lines.forEach((line, index) => {
    if (line.ref === undefined) out.push({ code: 'ingredient', index });
    if (parseEntry(line.amount).kind === 'invalid') out.push({ code: 'amount', index });
  });
  if (parseEntry(form.yieldAmount).kind === 'invalid') out.push({ code: 'yield' });
  return out;
};

export type RecordResult =
  { ok: true; record: ComponentRecord } | { ok: false; problems: Problem[] };

/** The record to store; new records are their own version family. `today` is `YYYY-MM-DD`. */
export const formToRecord = (form: ComponentForm, today: string): RecordResult => {
  const problems = problemsOf(form);
  if (problems.length > 0) return { ok: false, problems };
  const lines = form.lines.map((line): ComponentLine => {
    const entry = parseEntry(line.amount);
    return {
      ref: line.ref as ComponentRef,
      ...(entry.kind === 'ok' ? { amount: { value: entry.value, unit: line.unit } } : {}),
      ...(line.role === undefined ? {} : { role: line.role }),
      ...(line.state === undefined ? {} : { state: line.state }),
      ...(line.note === undefined || line.note === '' ? {} : { note: line.note }),
    };
  });
  const yielded = parseEntry(form.yieldAmount);
  const steps = form.method
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  const usesBase = lines.some((l) => l.role !== undefined && l.role === form.percentBase);
  return {
    ok: true,
    record: {
      id: form.id,
      name: form.name.trim(),
      ...(form.role === '' ? {} : { role: form.role }),
      ...(form.templateId === undefined ? {} : { templateId: form.templateId }),
      ...(form.percentBase !== undefined && usesBase ? { percentBase: form.percentBase } : {}),
      lines,
      ...(yielded.kind === 'ok'
        ? {
            yield: {
              amount: { value: yielded.value, unit: form.yieldUnit },
              source: form.yieldSource ?? 'user',
            },
          }
        : {}),
      ...(steps.length === 0 ? {} : { method: steps }),
      version: form.version ?? { family: form.id, date: today },
    } as ComponentRecord,
  };
};
