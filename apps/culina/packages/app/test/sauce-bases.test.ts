// The shipped sauces that are bases (alioli, mayonnaise, two hollandaises, tomato sauce) are parts
// of dishes: they are on no dish list, in the finder's question or the random pick's pool, and
// they stay among the components and keep their own screen. On the real shipped files; no
// browser.
import { afterEach, beforeEach, expect, test } from 'vitest';
import { dishEntries } from '../src/browse/entries';
import { CLASSICS } from '../src/classics';
import {
  classicOf,
  classics,
  dishClassics,
  loadContent,
  resetContent,
} from '../src/classics/content';
import { shippedEntries } from '../src/components/shipped';
import { shippedNow } from '../src/cook/entries';
import { reset } from '../src/notebook/state';

const SAUCES = ['alioli', 'holl-sauce', 'mayonnaise', 'salsa-di-pomodoro', 'sauce-hollandaise'];

beforeEach(async () => {
  reset();
  resetContent();
  await loadContent(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          format: 'culina-classics',
          formatVersion: 1,
          classics: CLASSICS,
          techniques: [],
        }),
    }),
  );
});
afterEach(() => {
  reset();
  resetContent();
});

test('the five sauce bases are no dishes; every other shipped file is', () => {
  const left = classics()
    .filter((c) => !dishClassics().includes(c))
    .map((c) => c.id)
    .sort();
  expect(left).toEqual(SAUCES);
  expect(dishClassics()).toBe(dishClassics());
});

test('no dish entry, and so no row on Cook and no random dish, is a sauce base', () => {
  const keys = dishEntries().map((e) => e.key);
  expect(keys).toHaveLength(classics().length - SAUCES.length);
  for (const id of SAUCES) expect(keys).not.toContain(`shipped:${id}`);
  // Control: a base that is no sauce, and a plain dish, are there.
  expect(keys).toContain('shipped:risotto-alla-milanese');
  expect(keys).toContain('shipped:tortilla-de-patatas');
});

test('the finder is not asked for them', () => {
  const asked = shippedNow().classics.map((c) => c.id);
  for (const id of SAUCES) expect(asked).not.toContain(id);
});

test('each is still a component of the kit and keeps its own screen', () => {
  const parts = shippedEntries(classics(), 'en').map((e) => e.classicId);
  for (const id of SAUCES) {
    expect(parts).toContain(id);
    expect(classicOf(id)?.id).toBe(id);
  }
});
