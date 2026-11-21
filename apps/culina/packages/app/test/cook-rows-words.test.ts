// The finder's wording found by a tester in German (2026-11-21): role words keep their capital in
// German sentences, a shipped ratio card is named as on the Ratios screen, and a group or a whole in
// stock that covers a line is named. The rows are built in English here (the test language); the
// German strings are checked on their own. Not proved: the German screen (e2e/everyday-stock.mjs).
import type { MakeableCandidate } from '@culina/engine';
import { expect, test } from 'vitest';
import { cookStringsDe } from '../src/de/strings-cook';
import { appStringsDe } from '../src/de/strings-app';
import { cookRow } from '../src/cook/rows';
import type { Lookup } from '../src/cook/lookup';

const look: Lookup = {
  name: (ref) =>
    ({ egg: 'Egg', 'egg-whole': 'Egg, whole', 'egg-yolk': 'Egg, yolk' })[ref.id] ?? ref.id,
  itemRef: () => undefined,
};

const template: MakeableCandidate = {
  kind: 'template',
  id: 'pasta-dough',
  name: 'Pasta dough (engine name)',
  complete: false,
  lacking: 1,
  lines: [
    {
      index: 0,
      role: 'flour',
      optional: false,
      status: 'missing',
      items: [],
    },
    {
      index: 1,
      role: 'egg',
      ref: { kind: 'ingredient', id: 'egg' },
      optional: false,
      status: 'have',
      source: 'stock',
      items: ['s1'],
      through: { rule: 'group', asked: 'egg-whole', inStock: 'egg', itemId: 's1' },
    },
  ],
  roles: ['egg', 'fat'],
  usedItems: ['s1'],
  substitutions: [],
};

test('a shipped ratio card is named by the strings, a role in a sentence in lower case in English', () => {
  const row = cookRow(template, look, () => []);
  expect(row.name).toBe('Pasta dough');
  expect(row.reason).toContain('covers egg, fat');
  expect(row.lacks).toEqual(['flour']);
});

test('a group in stock that covers a line is named', () => {
  const row = cookRow(template, look, () => []);
  expect(row.substitutions).toEqual(['Egg in stock counts for Egg, whole']);
  const part = cookRow(
    {
      ...template,
      lines: [
        {
          index: 0,
          ref: { kind: 'ingredient', id: 'egg-yolk' },
          optional: false,
          status: 'have',
          items: ['s1'],
          through: { rule: 'part', asked: 'egg-yolk', inStock: 'egg-whole', itemId: 's1' },
        },
      ],
    },
    look,
    () => [],
  );
  expect(part.substitutions).toEqual(['Egg, yolk from the Egg, whole in stock']);
});

test('German keeps the capital of a noun and has the German name of the ratio card', () => {
  expect(cookStringsDe.roleInSentence('Fett')).toBe('Fett');
  expect(
    cookStringsDe.reasonRoles(['Fett', 'Mehl'].map(cookStringsDe.roleInSentence).join(', ')),
  ).toBe('Rollen: Fett, Mehl');
  expect(appStringsDe.ratios.seed['pasta-dough']?.name).toBe('Nudelteig');
});
