// The kit for own recipes (docs/data-model.md, "Step"): a step says what is done by a technique, a
// plain action or a note, and no longer needs a text; a shipped dish keeps its text. The plain
// actions are a shipped list beside the techniques.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { ACTIONS, TECHNIQUES, actionById, stepWord, validateSteps } from '../src/index';
import type { Step } from '../src/index';
import { contentValidators as content, validators } from './validators';

const example = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../schemas/examples/${name}.json`, import.meta.url)),
      'utf8',
    ),
  ) as T;
interface WithSteps {
  lines: { key?: string }[];
  steps: Step[];
}
const component = (steps: Step[]): WithSteps => ({
  ...example<WithSteps>('component-steps.valid'),
  steps,
});
const codes = (steps: Step[], options = {}): string[] => {
  const result = validateSteps(component(steps), new Set(['example-technique']), {
    actionIds: new Set(ACTIONS.map((a) => a.id)),
    ...options,
  });
  return result.ok ? [] : result.error.findings.map((f) => f.code);
};

describe('the plain actions', () => {
  test('each has an id of its own and a name in both languages', () => {
    const ids = ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(20);
    for (const action of ACTIONS) {
      expect(action.id, action.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(action.name.en.trim(), action.id).not.toBe('');
      expect(action.name.de.trim(), action.id).not.toBe('');
    }
  });
  test('none shares its id with a technique, so a word is one or the other', () => {
    const techniques = new Set(TECHNIQUES.map((t) => t.id));
    expect(ACTIONS.filter((a) => techniques.has(a.id)).map((a) => a.id)).toEqual([]);
  });
  test('an action is found by its id', () => {
    expect(actionById('set-aside')?.name.de).toBe('Beiseitestellen');
    expect(actionById('sear')).toBeUndefined();
  });
});

describe('a step of an own recipe', () => {
  test('the schema accepts a technique, an action or a note alone, with the lines used', () => {
    for (const step of [
      { technique: 'example-technique', uses: ['fat'] },
      { action: 'set-aside', uses: ['liquid'] },
      { note: 'until golden' },
      { action: 'drain', note: 'keep a cup of the water', time: { value: 2, unit: 'min' } },
    ] as Step[]) {
      expect(validators.components(component([step])), JSON.stringify(step)).toBe(true);
      expect(codes([step]), JSON.stringify(step)).toEqual([]);
    }
  });
  test('the schema refuses a step that says nothing, and one with a technique and an action', () => {
    expect(validators.components(component([{ uses: ['fat'] }]))).toBe(false);
    expect(
      validators.components(component([{ technique: 'example-technique', action: 'drain' }])),
    ).toBe(false);
    expect(validators.components(component([{ note: '' }]))).toBe(false);
  });
  test('the engine names what the schema cannot: an unknown action, an empty step, two words', () => {
    expect(codes([{ action: 'levitate' }])).toEqual(['unknown-action']);
    expect(codes([{ uses: ['fat'] }])).toEqual(['step-empty']);
    expect(codes([{ note: '   ' }])).toEqual(['step-empty']);
    expect(codes([{ technique: 'example-technique', action: 'drain' }])).toEqual([
      'technique-and-action',
    ]);
    expect(codes([{ technique: 'nothing' }])).toEqual(['unknown-technique']);
    expect(codes([{ action: 'drain', uses: ['nothing'] }])).toEqual(['unknown-line']);
  });
  test('without the list of actions an action is not checked', () => {
    const result = validateSteps(component([{ action: 'levitate' }]), new Set());
    expect(result).toEqual({ ok: true });
  });
  test('a text, where there is one, is still complete in both languages', () => {
    expect(codes([{ text: { en: 'Melt.', de: '' }, action: 'melt' }])).toEqual(['text-incomplete']);
  });
  test('the word of a step is its technique, else its action', () => {
    expect(stepWord({ technique: 'sear' })).toEqual({ kind: 'technique', id: 'sear' });
    expect(stepWord({ action: 'drain' })).toEqual({ kind: 'action', id: 'drain' });
    expect(stepWord({ note: 'until golden' })).toBeUndefined();
  });
});

describe('a step of a shipped dish', () => {
  interface Classic {
    components: { steps: Step[] }[];
  }
  test('keeps its text: the schema and the engine refuse a step without one', () => {
    const classic = example<Classic>('classic.valid');
    expect(content.classic(classic)).toBe(true);
    const first = classic.components[0] as { steps: Step[] };
    const step: Step = { ...(first.steps[0] as Step), action: 'mix' };
    delete step.text;
    first.steps[0] = step;
    expect(content.classic(classic)).toBe(false);
    expect(codes([{ action: 'mix' }], { textRequired: true })).toEqual(['text-incomplete']);
  });
});
