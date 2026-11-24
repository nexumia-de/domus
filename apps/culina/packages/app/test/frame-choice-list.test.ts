// A frame is judged everywhere by the filling the cook chose (docs/behaviour.md, Cook): the entry
// of Cook's list (meat line, characters, "complete"), the filter, "Only with what I have", "Use up
// first" and the random pick's pool, which all read `dishClassics` and the cached entries. On the
// real shipped files and the real catalogue (fetched through a stubbed `fetch`), an empty notebook
// and a stock written here. Not proved: a browser (e2e/frame-choice.mjs), a reload (the choice is
// in memory only, so a fresh module state is the shipped frame), the native screens.
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { entryOfClassic } from '../src/browse/entry';
import {
  derivations,
  dishEntries,
  dishEntriesByKey,
  shippedEntriesMade,
} from '../src/browse/entries';
import { matchesFilter } from '../src/browse/filter';
import { resetCatalogue } from '../src/catalogue/load';
import { characterLookup } from '../src/characters/lookup';
import { asChosen, chooseFilling, resetChoices } from '../src/classics/choices';
import { classicOf, dishClassics, loadContent, resetContent } from '../src/classics/content';
import { loadNames } from '../src/classics/names';
import { shippedNow } from '../src/cook/entries';
import type { CookSource } from '../src/cook/input';
import { dishPool } from '../src/dishes/pick-dish';
import { readyKeysOf } from '../src/dishes/ready-now';
import { useUpFrom } from '../src/dishes/use-up-order';
import { reset } from '../src/notebook/state';
import { shippedContent } from '../make-classics.mjs';
import { must } from './must';

const TODAY = '2026-11-24';
const SALMON = 'fdc-173686';
const EGG = 'fdc-171287';
const OMELETTE = 'tamagoyaki-omelette';
const SALMON_FILLING = 'sake-no-shioyaki-salmon';

const catalogueFile = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
    'utf8',
  ),
) as unknown;

beforeAll(async () => {
  reset();
  resetContent();
  resetCatalogue();
  const content = shippedContent();
  await loadContent(() => Promise.resolve({ ok: true, json: () => Promise.resolve(content) }));
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(catalogueFile) })),
  );
  await loadNames();
});
afterEach(() => resetChoices());
afterAll(() => {
  reset();
  resetContent();
  resetCatalogue();
  vi.unstubAllGlobals();
});

const meal = () => must(classicOf('teishoku'));
const mainSlot = () => meal().slots.findIndex((s) => s.role === 'main');
const entry = (id: string) => must(dishEntriesByKey().get(`shipped:${id}`));
/** Every ingredient of the components of a dish as it is cooked: a stock that covers it. */
const stockFor = (id: string): CookSource['stock'] => {
  const dish = must(dishClassics().find((c) => c.id === id));
  const ids = new Set(
    (dish.components ?? []).flatMap((c) =>
      c.lines.flatMap((l) => (l.ref?.kind === 'ingredient' ? [l.ref.id] : [])),
    ),
  );
  return [...ids].map((ingredient) => ({
    id: `s-${ingredient}`,
    ref: { kind: 'ingredient' as const, id: ingredient },
  }));
};
const source = (stock: CookSource['stock']): CookSource => ({
  ingredients: [],
  components: [],
  dishes: [],
  stock,
});

test('the set meal with the omelette: its entry is without meat and fish and passes the filter; the shipped filling again brings it back', () => {
  const shipped = entry('teishoku');
  expect(shipped.meatFree).toBe(false);
  expect(shipped.characters).toContain('with-fish');
  expect(matchesFilter(shipped, { meatFree: true })).toBe(false);
  const tacos = entry('tacos');
  const plain = entry('chana-masala');
  expect(dishPool(dishEntries(), { meatFree: true }).some((e) => e.id === 'teishoku')).toBe(false);
  const madeBefore = shippedEntriesMade.count;

  expect(chooseFilling(meal(), mainSlot(), OMELETTE)).toBe(true);
  const chosen = entry('teishoku');
  expect(chosen).not.toBe(shipped);
  expect(chosen.meatFree).toBe(true);
  expect(matchesFilter(chosen, { meatFree: true })).toBe(true);
  // The random pick draws from the same entries: under "Without meat and fish" the set meal is in
  // its pool now.
  expect(dishPool(dishEntries(), { meatFree: true }).some((e) => e.id === 'teishoku')).toBe(true);
  // The characters and "complete" are those of the frame as chosen.
  const asCooked = entryOfClassic(asChosen(meal()), characterLookup, 'en');
  expect(chosen.characters).toEqual(asCooked.characters);
  expect(chosen.characters).not.toContain('with-fish');
  expect(matchesFilter(chosen, { character: 'with-fish' })).toBe(false);
  expect(chosen.complete).toBe(asCooked.complete);
  // Controls: another frame's entry and an unrelated dish's entry are the very same objects; one
  // entry was made anew, not the list.
  expect(entry('tacos')).toBe(tacos);
  expect(entry('chana-masala')).toBe(plain);
  expect(shippedEntriesMade.count).toBe(madeBefore + 1);

  // The shipped filling again: the entry is as shipped.
  expect(chooseFilling(meal(), mainSlot(), SALMON_FILLING)).toBe(true);
  expect(entry('teishoku')).toEqual(shipped);
  expect(entry('teishoku').meatFree).toBe(false);
  expect(entry('tacos')).toBe(tacos);
});

test('a choice reaches the list on the next draw; without one nothing is derived again', () => {
  const list = dishClassics();
  expect(dishClassics()).toBe(list);
  dishEntriesByKey();
  const before = derivations.shipped;
  dishEntriesByKey();
  expect(derivations.shipped).toBe(before);
  chooseFilling(meal(), mainSlot(), OMELETTE);
  const after = dishClassics();
  expect(after).not.toBe(list);
  // Every other dish is the same object; the set meal is the frame as chosen.
  for (const [i, c] of after.entries()) if (c.id !== 'teishoku') expect(c).toBe(list[i]);
  const mealNow = must(after.find((c) => c.id === 'teishoku'));
  expect(mealNow.slots[mainSlot()]?.ref?.id).toBe(OMELETTE);
  dishEntriesByKey();
  expect(derivations.shipped).toBe(before + 1);
  // Asked again with the same choice: nothing new.
  expect(dishClassics()).toBe(after);
  dishEntriesByKey();
  expect(derivations.shipped).toBe(before + 1);
});

test('"Only with what I have" asks the stock for the eggs of the omelette, not for the salmon', () => {
  chooseFilling(meal(), mainSlot(), OMELETTE);
  const withOmelette = stockFor('teishoku');
  expect(withOmelette.some((s) => s.ref.id === EGG)).toBe(true);
  expect(withOmelette.some((s) => s.ref.id === SALMON)).toBe(false);
  // As chosen, the stock without salmon covers the set meal.
  expect(readyKeysOf(source(withOmelette), TODAY, shippedNow()).has('shipped:teishoku')).toBe(true);
  // Control: as shipped, the same stock lacks the salmon, and the set meal is not ready.
  resetChoices();
  expect(readyKeysOf(source(withOmelette), TODAY, shippedNow()).has('shipped:teishoku')).toBe(
    false,
  );
  const withSalmon = stockFor('teishoku');
  expect(withSalmon.some((s) => s.ref.id === SALMON)).toBe(true);
  expect(readyKeysOf(source(withSalmon), TODAY, shippedNow()).has('shipped:teishoku')).toBe(true);
});

test('"Use up first" places the set meal by the egg once the omelette is chosen, by the salmon as shipped', () => {
  const dated = (id: string): CookSource['stock'][number] => ({
    id: `d-${id}`,
    ref: { kind: 'ingredient', id },
    useBy: '2026-11-25',
  });
  const markOf = (stock: CookSource['stock']) =>
    useUpFrom(source(stock), TODAY, dishEntriesByKey(), shippedNow()).marks.get('shipped:teishoku');
  // As shipped: the salmon places it, the egg does not.
  expect(markOf([dated(SALMON)])?.itemId).toBe(`d-${SALMON}`);
  expect(markOf([dated(EGG)])).toBeUndefined();
  chooseFilling(meal(), mainSlot(), OMELETTE);
  expect(markOf([dated(EGG)])?.itemId).toBe(`d-${EGG}`);
  expect(markOf([dated(SALMON)])).toBeUndefined();
});
