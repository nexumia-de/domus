// The steps of a component in the editor's form (docs/behaviour.md, "Steps of a component"): what a
// record came with is kept, a step of the kit is stored without a text, and what cannot be stored
// is named at its step.
import type { Step } from '@culina/engine';
import { expect, test } from 'vitest';
import {
  formFromRecord,
  formToRecord,
  freshLineKey,
  isBlankStep,
  newComponentForm,
  newStepForm,
  problemsOf,
  type ComponentForm,
  type StepForm,
} from '../src/editor/component-form';
import type { ComponentRecord } from '../src/records';
import { must } from './must';

const ing = (id: string) => ({ kind: 'ingredient' as const, id });

/** A component as the copy of a shipped dish stores it: line keys, steps with text, a range. */
const copied = (): ComponentRecord => ({
  id: 'u-1',
  name: 'Sauce',
  lines: [
    { key: 'fat', ref: ing('butter'), amount: { value: 50, unit: 'g' } },
    { key: 'liquid', ref: ing('milk'), amount: { value: 250, unit: 'ml' } },
    { ref: ing('salt') },
  ],
  steps: [
    {
      text: { en: 'Melt the fat.', de: 'Das Fett schmelzen.' },
      technique: 'roux',
      uses: ['fat'],
      time: { value: 5, to: 8, unit: 'min' },
    },
    {
      text: { en: 'Add the liquid.', de: 'Die Flüssigkeit zugeben.' },
      uses: ['liquid'],
      temperature: { value: 180, unit: 'C' },
    },
  ],
  version: { family: 'u-1', date: '2026-11-19' },
});

const saved = (form: ComponentForm): ComponentRecord => {
  const built = formToRecord(form, '2026-11-20');
  if (!built.ok) throw new Error(JSON.stringify(built.problems));
  return built.record;
};
const kit = (steps: Partial<StepForm>[]): ComponentForm => ({
  ...newComponentForm('u-2'),
  name: 'Stew',
  lines: [
    { ref: ing('beef'), amount: '500', unit: 'g' },
    { ref: ing('onion'), amount: '200', unit: 'g' },
  ],
  steps: steps.map((step) => ({ ...newStepForm(), ...step })),
});

test('editing a copied dish keeps its steps and the keys of its lines', () => {
  const record = copied();
  const again = saved(formFromRecord(record));
  expect(again.steps).toEqual(record.steps);
  expect(again.lines.map((l) => l.key)).toEqual(['fat', 'liquid', undefined]);
});

test('a step of the kit is stored by its word, its lines, time, temperature and note, without a text', () => {
  const form = kit([
    {
      word: 't:sear',
      uses: ['l1'],
      time: '10',
      temperature: '200',
      temperatureUnit: 'C',
      note: 'until brown',
    },
    { word: 'a:set-aside', uses: ['l1'] },
    { note: 'taste before serving' },
  ]);
  must(form.lines[0]).key = 'l1';
  const expected: Step[] = [
    {
      technique: 'sear',
      uses: ['l1'],
      time: { value: 10, unit: 'min' },
      temperature: { value: 200, unit: 'C' },
      note: 'until brown',
    },
    { action: 'set-aside', uses: ['l1'] },
    { note: 'taste before serving' },
  ];
  const record = saved(form);
  expect(record.steps).toEqual(expected);
  expect(record.lines.map((l) => l.key)).toEqual(['l1', undefined]);
});

test('a step nothing was entered in is left out, and a component without steps stores none', () => {
  expect(isBlankStep(newStepForm())).toBe(true);
  expect(saved(kit([{}, { word: 'a:serve' }, {}])).steps).toEqual([{ action: 'serve' }]);
  expect(saved(kit([{}])).steps).toBeUndefined();
  expect(saved(kit([]))).not.toHaveProperty('steps');
});

test('a draft written before the steps existed is still a form that saves', () => {
  const { steps: _steps, ...older } = kit([]);
  void _steps;
  expect(problemsOf(older)).toEqual([]);
  expect(saved(older)).not.toHaveProperty('steps');
});

test('what a step still needs is named at the step', () => {
  // Lines ticked, but nothing says what is done.
  expect(problemsOf(kit([{ uses: ['l1'] }]))).toEqual([{ code: 'step', index: 0 }]);
  expect(problemsOf(kit([{ word: 'a:mix' }, { time: '5' }]))).toEqual([{ code: 'step', index: 1 }]);
  expect(problemsOf(kit([{ word: 'a:mix', time: 'soon' }]))).toEqual([
    { code: 'step-number', index: 0 },
  ]);
  expect(problemsOf(kit([{ word: 'a:mix', temperature: '-5' }]))).toEqual([
    { code: 'step-number', index: 0 },
  ]);
  expect(formToRecord(kit([{ uses: ['l1'] }]), '2026-11-20').ok).toBe(false);
});

test('a line that was removed is no longer used by a step', () => {
  const form = formFromRecord(copied());
  form.lines.splice(0, 1);
  const record = saved(form);
  // The first step used only the removed line: it keeps its text and technique, without `uses`.
  expect(must(record.steps)[0]).not.toHaveProperty('uses');
  expect(must(record.steps)[1]?.uses).toEqual(['liquid']);
});

test('the end of a range stays until the value is typed anew', () => {
  const form = formFromRecord(copied());
  const first = must(form.steps)[0] as StepForm;
  expect(first.timeTo).toBe(8);
  first.time = '6';
  delete first.timeTo;
  expect(must(saved(form).steps)[0]?.time).toEqual({ value: 6, unit: 'min' });
  // A typed value at or above the old end drops the end instead of storing a range that runs backwards.
  const other = formFromRecord(copied());
  (must(other.steps)[0] as StepForm).time = '9';
  expect(must(saved(other).steps)[0]?.time).toEqual({ value: 9, unit: 'min' });
});

test('a line gets a key no other line has', () => {
  expect(freshLineKey([])).toBe('l1');
  expect(freshLineKey([{ key: 'l1' }, { key: 'fat' }, {}])).toBe('l2');
  // The slots of a dish count on their own: s1, s2, ...
  expect(freshLineKey([{ key: 's1' }, {}], 's')).toBe('s2');
});
