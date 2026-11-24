// The steps of the shipped dishes are on the kit (docs/classic-format.md, "Steps"): every step
// names what is done, by a technique or by a plain action, never both, and every key in `uses` is
// a line of its component. A step that honestly has no word stands in the list below with the
// reason. What this does not prove: that the word fits the sentence; each was chosen by reading.
import { describe, expect, test } from 'vitest';
import { ACTIONS, TECHNIQUES, validateClassic } from '@culina/engine';
import type { Classic } from '@culina/engine';
import { CLASSICS } from '../src/classics';
import { must } from './must';

/** Steps without a word, as `<country>/<dish>/<component>/<index from 0>`, each with the reason. */
const NO_WORD: Readonly<Record<string, string>> = {
  'fr/pot-au-feu/pot-au-feu/10': 'wiping the rim of the pot is housekeeping, no step of cooking',
  'it/latte-brule/latte-brule/14': 'a sign that it is done (the skewer), nothing is done',
};

const techniqueIds = new Set(TECHNIQUES.map((t) => t.id));
const actionIds = new Set(ACTIONS.map((a) => a.id));
const steps = CLASSICS.flatMap((classic) =>
  (classic.components ?? []).flatMap((component) =>
    (component.steps ?? []).map((step, i) => ({
      at: `${classic.country}/${classic.id}/${component.id}/${i}`,
      keys: new Set(component.lines.flatMap((l) => (l.key === undefined ? [] : [l.key]))),
      step,
    })),
  ),
);

describe('the steps of the shipped dishes', () => {
  test('every step names a technique or a plain action, not both, except the listed ones', () => {
    const neither = steps
      .filter(({ step }) => step.technique === undefined && step.action === undefined)
      .map(({ at }) => at);
    expect(neither.sort()).toEqual(Object.keys(NO_WORD).sort());
    expect(
      steps
        .filter(({ step }) => step.technique !== undefined && step.action !== undefined)
        .map(({ at }) => at),
    ).toEqual([]);
    for (const reason of Object.values(NO_WORD)) expect(reason.trim()).not.toBe('');
  });
  test('every word is a known technique or a shipped plain action', () => {
    const unknown = steps.filter(
      ({ step }) =>
        (step.technique !== undefined && !techniqueIds.has(step.technique)) ||
        (step.action !== undefined && !actionIds.has(step.action)),
    );
    expect(unknown.map(({ at }) => at)).toEqual([]);
  });
  test('every key in uses is a line of the component, and none is named twice', () => {
    for (const { at, keys, step } of steps) {
      const uses = step.uses ?? [];
      expect(
        uses.filter((key) => !keys.has(key)),
        at,
      ).toEqual([]);
      expect(new Set(uses).size, at).toBe(uses.length);
      if (step.uses !== undefined) expect(uses.length, at).toBeGreaterThan(0);
    }
  });
  test('the counts of 2026-11-24: 933 steps, 235 with a technique, 696 with a plain action', () => {
    expect(steps.length).toBe(933);
    expect(steps.filter(({ step }) => step.technique !== undefined).length).toBe(235);
    expect(steps.filter(({ step }) => step.action !== undefined).length).toBe(696);
    expect(steps.filter(({ step }) => step.uses !== undefined).length).toBe(730);
  });
  test('every plain action the list gained on 2026-11-20 is used by a step', () => {
    const used = new Set(
      steps.flatMap(({ step }) => (step.action === undefined ? [] : [step.action])),
    );
    for (const id of [
      'cook',
      'pour',
      'sprinkle',
      'crush',
      'grease',
      'trim',
      'prepare',
      'turn',
      'take-out',
      'turn-out',
      'remove-from-heat',
      'stand',
    ]) {
      expect(actionIds.has(id), id).toBe(true);
      expect(used.has(id), id).toBe(true);
    }
  });
});

describe('the engine on a dish file', () => {
  test('refuses a plain action that is not shipped', () => {
    const classic = structuredClone(must(CLASSICS[0])) as Classic;
    const step = must(must(classic.components?.[0]).steps?.[0]);
    delete step.technique;
    step.action = 'no-such-action';
    const result = validateClassic(classic, { techniques: TECHNIQUES });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.findings.map((f) => `${f.code} ${f.value ?? ''}`)).toContain(
        'unknown-action no-such-action',
      );
    }
  });
});
