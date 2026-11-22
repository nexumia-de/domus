// The steps of an own component as the screens read them (docs/behaviour.md, "Steps of a
// component"): the words to choose from, one line per step, and the steps for cooking with the note
// of a skill at its first step while it is not learned.
import type { Technique } from '@culina/engine';
import { expect, test } from 'vitest';
import { handlingNotes } from '../src/classics/handling-view';
import { ownCookView, stepLines, wordName, wordOptions } from '../src/components/steps-view';
import { buildNotebook } from '../src/notebook/build';
import type { ComponentRecord } from '../src/records';
import { must } from './must';

const ing = (id: string) => ({ kind: 'ingredient' as const, id });
const technique = (id: string, en: string, de: string): Technique => ({
  id,
  name: { en, de },
  watch: { en: `Watch ${en}.`, de: `Achte auf ${de}.` },
  why: { en: 'Because.', de: 'Darum.' },
  level: 'textbook',
  sources: [{ title: 'A book', place: 'p. 1', isbn: '9780000000002', sentence: 'It is so.' }],
});
const SEAR = technique('sear', 'Searing', 'Scharf anbraten');
const BRAISE = technique('braise', 'Braising', 'Schmoren');
const KNOWN = [SEAR, BRAISE];

const nb = buildNotebook(
  [
    { id: 'beef', name: 'Beef' },
    { id: 'onion', name: 'Onion' },
    { id: 'cream', name: 'Cream', parentId: 'group-cream' },
  ],
  [],
);
const stew = (): ComponentRecord => ({
  id: 'u-1',
  name: 'Stew',
  lines: [
    { key: 'l1', ref: ing('beef'), amount: { value: 500, unit: 'g' } },
    { key: 'l2', ref: ing('onion'), amount: { value: 200, unit: 'g' } },
    { key: 'l3', ref: ing('cream') },
  ],
  steps: [
    { technique: 'sear', uses: ['l1'], time: { value: 10, unit: 'min' }, note: 'until brown' },
    { action: 'set-aside', uses: ['l1'] },
    { technique: 'sear', uses: ['l2'] },
    { technique: 'braise', uses: ['l1', 'l2', 'l3'], temperature: { value: 160, unit: 'C' } },
    { note: 'taste before serving' },
    { text: { en: 'Serve hot.', de: 'Heiß servieren.' }, action: 'serve' },
  ],
  version: { family: 'u-1', date: '2026-11-20' },
});

test('the words to choose from: the skills and the simple actions, each sorted by name', () => {
  const { skills, plain } = wordOptions('en', KNOWN);
  expect(skills).toEqual([
    { value: 't:braise', label: 'Braising' },
    { value: 't:sear', label: 'Searing' },
  ]);
  expect(plain.length).toBeGreaterThan(20);
  expect(plain.every((o) => o.value.startsWith('a:'))).toBe(true);
  expect(plain.map((o) => o.label)).toEqual(
    [...plain.map((o) => o.label)].sort((a, b) => a.localeCompare(b, 'en')),
  );
  expect(wordOptions('de', KNOWN).plain.some((o) => o.label === 'Beiseitestellen')).toBe(true);
});

test('a step is called by its technique or its action, in the language asked for', () => {
  expect(wordName({ technique: 'sear' }, 'de', KNOWN)).toBe('Scharf anbraten');
  expect(wordName({ action: 'set-aside' }, 'en', KNOWN)).toBe('Set aside');
  expect(wordName({ note: 'until golden' }, 'en', KNOWN)).toBeUndefined();
  // A word this version does not know shows as its id, not as nothing.
  expect(wordName({ technique: 'levitate' }, 'en', KNOWN)).toBe('levitate');
});

test('one line per step: the word, what goes in, time, temperature and the note', () => {
  expect(stepLines(nb, stew(), 'en', KNOWN)).toEqual([
    'Searing: Beef · 10 min · until brown',
    'Set aside: Beef',
    'Searing: Onion',
    'Braising: Beef, Onion, Cream · 160 °C',
    'taste before serving',
    'Serve hot.',
  ]);
  expect(stepLines(nb, stew(), 'de', KNOWN)[0]).toBe(
    'Scharf anbraten: Beef · 10 min · until brown',
  );
  expect(stepLines(nb, { ...stew(), steps: [] }, 'en', KNOWN)).toEqual([]);
});

test('cooking: each step with its lines and amounts, the note of a skill at its first step only', () => {
  const steps = ownCookView(nb, stew(), 'en', KNOWN, new Set());
  expect(steps.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(steps.map((s) => s.text)).toEqual([
    'Searing · until brown',
    'Set aside',
    'Searing',
    'Braising',
    'taste before serving',
    'Serve hot.',
  ]);
  expect(steps.map((s) => s.note)).toEqual([true, false, false, true, false, false]);
  expect(steps.map((s) => s.technique?.id)).toEqual([
    'sear',
    undefined,
    'sear',
    'braise',
    undefined,
    undefined,
  ]);
  const first = must(steps[0]);
  expect(first.time).toBe('10 min');
  expect(first.lines.map((l) => [l.name, l.amount, l.ingredient])).toEqual([
    ['Beef', '500 g', 'beef'],
  ]);
  // A line without an amount shows its name alone.
  expect(must(steps[3]).lines.map((l) => l.amount)).toEqual(['500 g', '200 g', undefined]);
  expect(steps.every((s) => s.component === 'Stew')).toBe(true);
});

test('a learned skill gives no note, and a technique the app does not know gives none either', () => {
  const learned = ownCookView(nb, stew(), 'en', KNOWN, new Set(['sear']));
  expect(learned.map((s) => s.note)).toEqual([false, false, false, true, false, false]);
  const unknown = ownCookView(nb, stew(), 'en', [BRAISE], new Set());
  expect(unknown.map((s) => s.note)).toEqual([false, false, false, true, false, false]);
  expect(unknown[0]?.technique).toBeUndefined();
  expect(unknown[0]?.text).toBe('sear · until brown');
});

test('a handling rule shows at the step that uses its ingredient with its technique', () => {
  const steps = ownCookView(nb, stew(), 'en', KNOWN, new Set());
  const rule = {
    id: 'cream-in-acid-sauce',
    target: 'group-cream',
    text: { en: 'Cook only heavy cream.', de: 'Nur Schlagsahne mitkochen.' },
    why: { en: 'Acid.', de: 'Säure.' },
    technique: 'braise',
    level: 'textbook' as const,
    sources: SEAR.sources,
  };
  const tree = [{ id: 'cream', parentId: 'group-cream' }, { id: 'group-cream' }];
  const notes = handlingNotes(steps, [rule], tree, new Set());
  expect([...notes.keys()]).toEqual([3]);
  expect(notes.get(3)?.map((n) => [n.rule.id, n.name])).toEqual([['cream-in-acid-sauce', 'Cream']]);
  // Once the skill of the rule is learned, the rule is gone.
  expect(handlingNotes(steps, [rule], tree, new Set(['braise'])).size).toBe(0);
});
