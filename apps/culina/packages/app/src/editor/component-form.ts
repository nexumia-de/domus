// The component editor's form state (plain JSON, so it is also the draft) and its two
// translations: from a stored record to the form, and from the form to a record.
import type {
  ComponentLine,
  ComponentRef,
  FoodState,
  I18nText,
  KeepEntry,
  Step,
} from '@culina/engine';
import type { ComponentRecord, VersionInfo } from '../records';
import { appLang, withDecimalMark } from '../shared/locale';
import { parseEntry } from '../shared/parse';
import type { VersionNote } from './version-save';
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
  /** Names the line for the steps; kept from the record, given when a step first uses the line. */
  key?: string;
}

/** One step as the editor holds it: a word, the lines it uses, time, temperature and a note. */
export interface StepForm {
  /** What is done: empty for none, `t:<id>` for a technique, `a:<id>` for a plain action. */
  word: string;
  /** Keys of the lines the step uses. */
  uses: string[];
  /** As typed; empty for none. */
  time: string;
  timeUnit: 's' | 'min' | 'h';
  temperature: string;
  temperatureUnit: 'C' | 'F';
  /** The user's own remark, one line. */
  note: string;
  /** The text of a copied dish in both languages: shown, kept, not edited. */
  text?: I18nText;
  /** The end of a range a copy came with; dropped when the value is typed anew. */
  timeTo?: number;
  temperatureTo?: number;
}

/** How long the made component keeps in one place, as the editor holds it. */
export interface KeepForm {
  storage: KeepEntry['storage'];
  /** As typed: whole days. */
  days: string;
  note: string;
  /** Kept from the record; `user` once the days are typed anew. */
  source: string;
}

const WHOLE = /^\d+$/;

export const newStepForm = (): StepForm => ({
  word: '',
  uses: [],
  time: '',
  timeUnit: 'min',
  temperature: '',
  temperatureUnit: 'C',
  note: '',
});

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
  /** The steps of the kit; a draft written before they existed has none. */
  steps?: StepForm[];
  /** How long it keeps once made, per storage place. */
  keeps?: KeepForm[];
  version?: VersionInfo;
  /** Change, reason and tasting note for the version Save adds. */
  versionNote?: VersionNote;
}

export type Problem =
  | { code: 'name' }
  | { code: 'no-lines' }
  | { code: 'ingredient'; index: number }
  | { code: 'amount'; index: number }
  | { code: 'yield' }
  | { code: 'cycle' }
  | { code: 'step'; index: number }
  | { code: 'step-number'; index: number }
  | { code: 'keep'; index: number };

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
  steps: [],
  keeps: [],
});

const text = (n: number): string => withDecimalMark(String(n), appLang);

const stepForm = (step: Step): StepForm => ({
  word:
    step.technique !== undefined
      ? `t:${step.technique}`
      : step.action !== undefined
        ? `a:${step.action}`
        : '',
  uses: [...(step.uses ?? [])],
  time: step.time === undefined ? '' : text(step.time.value),
  timeUnit: step.time?.unit ?? 'min',
  temperature: step.temperature === undefined ? '' : text(step.temperature.value),
  temperatureUnit: step.temperature?.unit ?? 'C',
  note: step.note ?? '',
  ...(step.text === undefined ? {} : { text: step.text }),
  ...(step.time?.to === undefined ? {} : { timeTo: step.time.to }),
  ...(step.temperature?.to === undefined ? {} : { temperatureTo: step.temperature.to }),
});

/** True for a step nothing was entered in: Save leaves it out. */
export const isBlankStep = (step: StepForm): boolean =>
  step.word === '' &&
  step.note.trim() === '' &&
  step.text === undefined &&
  step.uses.length === 0 &&
  step.time.trim() === '' &&
  step.temperature.trim() === '';

/** A key no line of the form has yet: `l1`, `l2`, ... */
export const freshLineKey = (lines: readonly LineForm[]): string => {
  const taken = new Set(lines.map((l) => l.key));
  let n = 1;
  while (taken.has(`l${n}`)) n += 1;
  return `l${n}`;
};

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
    ...(line.key === undefined ? {} : { key: line.key }),
  })),
  yieldAmount: record.yield === undefined ? '' : text(record.yield.amount.value),
  yieldUnit: record.yield?.amount.unit ?? 'g',
  ...(record.yield === undefined ? {} : { yieldSource: record.yield.source }),
  method: (record.method ?? []).join('\n'),
  steps: (record.steps ?? []).map(stepForm),
  keeps: (record.keeps ?? []).map((k) => ({
    storage: k.storage,
    days: String(k.days),
    note: k.note ?? '',
    source: k.source,
  })),
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
  (form.steps ?? []).forEach((step, index) => {
    if (isBlankStep(step)) return;
    // A step says what is done: a word, a note or the text it was copied with.
    if (step.word === '' && step.note.trim() === '' && step.text === undefined) {
      out.push({ code: 'step', index });
    }
    if (
      parseEntry(step.time).kind === 'invalid' ||
      parseEntry(step.temperature).kind === 'invalid'
    ) {
      out.push({ code: 'step-number', index });
    }
  });
  const places = new Set<string>();
  (form.keeps ?? []).forEach((keep, index) => {
    // Whole days, and each storage place once.
    if (!WHOLE.test(keep.days.trim()) || places.has(keep.storage))
      out.push({ code: 'keep', index });
    places.add(keep.storage);
  });
  return out;
};

/** The step as it is stored; `keys` are the keys of the lines that exist. */
const stepRecord = (step: StepForm, keys: ReadonlySet<string>): Step => {
  const uses = step.uses.filter((key) => keys.has(key));
  const time = parseEntry(step.time);
  const temperature = parseEntry(step.temperature);
  const note = step.note.trim();
  return {
    ...(step.text === undefined ? {} : { text: step.text }),
    ...(step.word.startsWith('t:') ? { technique: step.word.slice(2) } : {}),
    ...(step.word.startsWith('a:') ? { action: step.word.slice(2) } : {}),
    ...(uses.length === 0 ? {} : { uses }),
    ...(time.kind === 'ok'
      ? {
          time: {
            value: time.value,
            ...(step.timeTo !== undefined && step.timeTo > time.value ? { to: step.timeTo } : {}),
            unit: step.timeUnit,
          },
        }
      : {}),
    ...(temperature.kind === 'ok'
      ? {
          temperature: {
            value: temperature.value,
            ...(step.temperatureTo !== undefined && step.temperatureTo > temperature.value
              ? { to: step.temperatureTo }
              : {}),
            unit: step.temperatureUnit,
          },
        }
      : {}),
    ...(note === '' ? {} : { note }),
  };
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
      ...(line.key === undefined ? {} : { key: line.key }),
    };
  });
  const keys = new Set(lines.flatMap((l) => (l.key === undefined ? [] : [l.key])));
  const kitSteps = (form.steps ?? [])
    .filter((step) => !isBlankStep(step))
    .map((step) => stepRecord(step, keys));
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
      ...(kitSteps.length === 0 ? {} : { steps: kitSteps }),
      ...((form.keeps ?? []).length === 0
        ? {}
        : {
            keeps: (form.keeps ?? []).map((keep): KeepEntry => {
              const note = keep.note.trim();
              return {
                storage: keep.storage,
                days: Number(keep.days.trim()),
                source: keep.source,
                ...(note === '' ? {} : { note }),
              };
            }),
          }),
      version: form.version ?? { family: form.id, date: today },
    } as ComponentRecord,
  };
};
