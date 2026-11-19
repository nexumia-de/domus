// Where handling rules show: once per dish at the first step that uses the ingredient, never with
// more than two notes on a step, and not at all once the technique is learned.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { cookView } from '../src/classics/cook-view';
import { handlingNotes, MAX_NOTES } from '../src/classics/handling-view';
import {
  EXAMPLE_HANDLING,
  EXAMPLE_TECHNIQUES,
  NAMES,
  PAN_DISH,
  SECOND_DISH,
} from './classics-fixture';
import { must } from './must';

const tree = (
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
      'utf8',
    ),
  ) as { ingredients: { id: string; parentId?: string }[] }
).ingredients;

const stepsOf = (dish: typeof PAN_DISH, learned: ReadonlySet<string> = new Set()) => {
  const view = cookView(dish, 2, 'en', NAMES, EXAMPLE_TECHNIQUES, learned);
  return must(view.ok ? view.steps : undefined);
};
const ids = (notes: ReturnType<typeof handlingNotes>, step: number) =>
  (notes.get(step) ?? []).map((n) => n.rule.id);

describe('handling notes by step', () => {
  test('a rule shows at the first step that uses its ingredient, a group rule included', () => {
    const notes = handlingNotes(stepsOf(PAN_DISH), EXAMPLE_HANDLING, tree, new Set());
    expect(ids(notes, 0)).toEqual(['example-rule-butter']);
    expect(ids(notes, 1)).toEqual(['example-rule-oil']);
    expect(ids(notes, 2)).toEqual(['example-rule-salt']);
    expect(must(notes.get(0)?.[0]).name).toBe('name of fdc-173410');
  });

  test('another dish with the same ingredient gets the rule too', () => {
    const notes = handlingNotes(stepsOf(SECOND_DISH), EXAMPLE_HANDLING, tree, new Set());
    expect(ids(notes, 0)).toEqual(['example-rule-butter']);
    expect(notes.size).toBe(1);
  });

  test('a learned technique takes its rules away', () => {
    const learned = new Set(['example-technique']);
    expect(handlingNotes(stepsOf(PAN_DISH), EXAMPLE_HANDLING, tree, learned).size).toBe(0);
  });

  test('a rule whose technique the dish does not use stays away', () => {
    const other = EXAMPLE_HANDLING.map((r) => ({ ...r, technique: 'not-used' }));
    expect(handlingNotes(stepsOf(PAN_DISH), other, tree, new Set()).size).toBe(0);
  });

  test('at most two notes on a step, the technique note counting first; the rest waits', () => {
    expect(MAX_NOTES).toBe(2);
    const steps = stepsOf(PAN_DISH);
    const first = must(steps[0]);
    expect(first.note).toBe(true);
    const crowded = steps.map((s, i) => (i === 0 ? { ...s, lines: [...s.lines, ...s.lines] } : s));
    // Both butter and the oil rule on step 1: the second waits for the oil's own step.
    const oil = must(steps[1]?.lines[0]);
    const mixed = crowded.map((s, i) => (i === 0 ? { ...s, lines: [...s.lines, oil] } : s));
    const notes = handlingNotes(mixed, EXAMPLE_HANDLING, tree, new Set());
    expect(ids(notes, 0)).toEqual(['example-rule-butter']);
    // Without the technique note there is room for two.
    const quiet = mixed.map((s, i) => (i === 0 ? { ...s, note: false } : s));
    expect(ids(handlingNotes(quiet, EXAMPLE_HANDLING, tree, new Set()), 0)).toEqual([
      'example-rule-butter',
      'example-rule-oil',
    ]);
    for (const [, list] of notes) expect(list.length).toBeLessThanOrEqual(MAX_NOTES);
  });

  test('a third rule waits for the next step that uses its ingredient', () => {
    const steps = stepsOf(PAN_DISH);
    const [s1, s2, s3] = [must(steps[0]), must(steps[1]), must(steps[2])];
    const withAll = [
      { ...s1, note: false, lines: [...s1.lines, ...s2.lines, ...s3.lines] },
      { ...s2, lines: [...s2.lines, ...s3.lines] },
      s3,
    ];
    const notes = handlingNotes(withAll, EXAMPLE_HANDLING, tree, new Set());
    expect(ids(notes, 0)).toEqual(['example-rule-butter', 'example-rule-oil']);
    expect(ids(notes, 1)).toEqual(['example-rule-salt']);
    expect(ids(notes, 2)).toEqual([]);
  });

  test('a loop in the tree gives no notes and no error', () => {
    const loop = [
      { id: 'fdc-173410', parentId: 'x' },
      { id: 'x', parentId: 'fdc-173410' },
    ];
    expect(handlingNotes(stepsOf(PAN_DISH), EXAMPLE_HANDLING, loop, new Set()).size).toBe(0);
  });
});
