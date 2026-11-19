// The notebook side of the classics: skill state written and read back, and keeping a classic as
// version 1 with its origin; a classic with a wanted line is refused and nothing is written.
import { beforeEach, expect, test } from 'vitest';
import { keepClassic } from '../src/classics/keep';
import {
  getDish,
  learnedSkills,
  listComponents,
  listDishes,
  setLearned,
  startNotebook,
} from '../src/notebook';
import { PAN_DISH, SECOND_DISH } from './classics-fixture';
import { freshFactory } from './store-helpers';
import { must } from './must';

const NOW = '2026-11-19T08:00:00.000Z';

beforeEach(async () => {
  await startNotebook({ indexedDB: freshFactory(), now: () => NOW });
});

test('marking a skill as learned is kept, and Teach again takes it back', async () => {
  expect(learnedSkills().size).toBe(0);
  expect((await setLearned('example-technique', true)).ok).toBe(true);
  expect([...learnedSkills()]).toEqual(['example-technique']);
  expect((await setLearned('example-technique', false)).ok).toBe(true);
  expect(learnedSkills().size).toBe(0);
});

test('a skill survives a new start of the notebook on the same store', async () => {
  const factory = freshFactory();
  await startNotebook({ indexedDB: factory, now: () => NOW });
  await setLearned('example-technique', true);
  await startNotebook({ indexedDB: factory, now: () => NOW });
  expect(learnedSkills().has('example-technique')).toBe(true);
});

test('keeping a classic writes components and a dish as version 1 with its origin', async () => {
  const done = await keepClassic(PAN_DISH, 2, 'en');
  expect(done.ok).toBe(true);
  const dish = must(listDishes()[0]);
  expect(dish.name).toBe('Example pan dish (fictional)');
  expect(dish.portions).toBe(2);
  expect(dish.version.family).toBe(dish.id);
  expect(getDish(dish.id)?.version.change).toContain('Example Cookbook');
  expect(listComponents()).toHaveLength(1);
  expect(must(listComponents()[0]).lines[0]?.amount).toEqual({ value: 100, unit: 'g' });
});

test('a classic with a wanted ingredient is refused by the engine and nothing is written', async () => {
  const done = await keepClassic(SECOND_DISH, 2, 'en');
  expect(done).toEqual({ ok: false, reason: 'wanted', names: ['Example broth stock'] });
  expect(listDishes()).toEqual([]);
  expect(listComponents()).toEqual([]);
});
