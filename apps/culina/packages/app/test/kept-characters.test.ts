// A shipped dish kept in the notebook is judged like the dish it was kept from
// (docs/dish-characters.md, "A kept copy is judged like its shipped dish"). Every shipped file
// that can be kept is kept by the app's own code (`keepClassic`) into a notebook on a fake
// IndexedDB, and every frame once more per filling it offers; the copy's characters (`factsOfDish`
// through its entry) must be the shipped dish's (`factsOfClassic` of the dish as chosen). On
// f4f9f59 this failed for 51 of the 130 files (36 of the 103 dishes Cook lists) and for 4 of the 14
// fillings: a component slot of a copy has no amount, and its lines had no mass. Then for 10 more
// eggs, yolks and whites by the piece were not weighed, and for one the lines of one ingredient
// were merged. Not proved here: a browser (e2e/cook-groups.mjs keeps the pizza and filters by
// "Cheesy"); a notebook kept on a real device; a copy kept before 2026-11-24, whose ingredient
// slots hold a total (see the docs: four dishes).
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deriveClassic, slotAlternatives } from '@culina/engine';
import type { Classic } from '@culina/engine';
import { dishesLike } from '../src/browse/alike';
import { dishEntries, dishEntriesByKey } from '../src/browse/entries';
import { resetCatalogue } from '../src/catalogue/load';
import { factsOfClassic } from '../src/characters/classic';
import { characterLookup } from '../src/characters/lookup';
import { characterIds } from '../src/characters/view';
import { asChosen, chooseFilling, resetChoices, withChoices } from '../src/classics/choices';
import { classicOf, classics, loadContent, resetContent } from '../src/classics/content';
import { keepClassic } from '../src/classics/keep';
import { loadNames } from '../src/classics/names';
import { asNextVersion } from '../src/editor/version-save';
import { shownOfClassic, shownOfDish } from '../src/dishes/shown';
import { slotRows } from '../src/dishes/slots';
import { dishCookView, dishParts } from '../src/components/steps-view';
import { dishRaw } from '../src/dishes/raw';
import { stringsEn } from '../src/strings';
import { formatMass } from '../src/shared/mass';
import { listDishes, notebook, saveRecord, startNotebook } from '../src/notebook';
import { reset } from '../src/notebook/state';
import type { DishRecord } from '../src/records';
import { shippedContent } from '../make-classics.mjs';
import { freshFactory } from './store-helpers';
import { must } from './must';

const content = shippedContent();
const catalogueFile = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
    'utf8',
  ),
) as unknown;

const load = () =>
  loadContent(() => Promise.resolve({ ok: true, json: () => Promise.resolve(content) }));

beforeAll(async () => {
  resetCatalogue();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(catalogueFile) })),
  );
  await loadNames();
});
beforeEach(async () => {
  reset();
  resetContent();
  resetChoices();
  await startNotebook({ indexedDB: freshFactory(), now: () => '2026-11-24T08:00:00.000Z' });
  await load();
});
afterAll(() => {
  reset();
  resetContent();
  resetChoices();
  resetCatalogue();
  vi.unstubAllGlobals();
});

/** The characters of the shipped dish as chosen on its page. */
const shippedCharacters = (classic: Classic): string[] =>
  characterIds(factsOfClassic(asChosen(classic), characterLookup));

/** Keeps the dish as chosen (Keep copies `withChoices`) and gives the characters of the copy. */
const keptCharacters = async (classic: Classic, portions = 2): Promise<string[] | undefined> => {
  const done = await keepClassic(withChoices(classic), portions, 'en');
  if (!done.ok) return undefined;
  return [...must(dishEntriesByKey().get(`own:${done.dishId}`)).characters];
};

/** Keeps a shipped dish by id and gives the entry of the copy. */
const keep = async (id: string) => {
  const done = await keepClassic(must(classicOf(id)), 4, 'en');
  if (!done.ok) throw new Error(`not kept: ${id}`);
  return must(dishEntriesByKey().get(`own:${done.dishId}`));
};

describe('every copy kept unchanged is judged like its shipped dish', () => {
  test(
    'every shipped file that can be kept, at 2 and at 4 portions',
    { timeout: 60_000 },
    async () => {
      const differ: string[] = [];
      let kept = 0;
      for (const classic of classics()) {
        for (const portions of [2, 4]) {
          const copy = await keptCharacters(classic, portions);
          if (copy === undefined) continue;
          kept++;
          const shipped = shippedCharacters(classic);
          if (copy.join() !== shipped.join())
            differ.push(`${classic.id} at ${portions}: ${shipped.join()} / ${copy.join()}`);
        }
      }
      expect(differ).toEqual([]);
      // 130 files kept twice; 18 cannot be kept (a `wanted` line). A smaller count means files
      // were not read, and the test would prove less.
      expect(kept).toBe(260);
    },
  );

  test('every frame with each filling it offers', { timeout: 30_000 }, async () => {
    const differ: string[] = [];
    let fillings = 0;
    for (const classic of classics()) {
      for (const [index, slot] of classic.slots.entries()) {
        for (const other of slotAlternatives(classic, slot)) {
          resetChoices();
          expect(chooseFilling(classic, index, other.id)).toBe(true);
          const copy = await keptCharacters(classic);
          if (copy === undefined) continue;
          fillings++;
          const shipped = shippedCharacters(classic);
          if (copy.join() !== shipped.join())
            differ.push(`${classic.id} with ${other.id}: ${shipped.join()} / ${copy.join()}`);
        }
      }
    }
    expect(differ).toEqual([]);
    expect(fillings).toBe(14);
  });
});

describe('the dishes the defect was found on', () => {
  test('the kept pizza is cheesy', async () => {
    expect((await keep('pizza-margherita')).characters).toContain('cheesy');
  });

  test('the kept tacos are lemony', async () => {
    expect((await keep('tacos')).characters).toContain('lemony');
  });

  test('the kept souvlaki plate is lemony and not tomatoey', async () => {
    const copy = await keep('souvlaki-plate');
    expect(copy.characters).toContain('lemony');
    expect(copy.characters).not.toContain('tomatoey');
  });

  test('four that are no frame: tamagoyaki eggy, horiatiki cheesy, köfte rich, bulgur pilavı not tomatoey', async () => {
    expect((await keep('tamagoyaki')).characters).toContain('eggy');
    expect((await keep('horiatiki')).characters).toContain('cheesy');
    expect((await keep('kofte')).characters).toContain('rich');
    expect((await keep('bulgur-pilavi')).characters).not.toContain('tomatoey');
  });

  test('a soufflé of eggs by the piece is eggy once its eggs are weighed as on the shipped dish', async () => {
    expect((await keep('souffle-parmesan')).characters).toContain('eggy');
  });

  test('snow eggs are eggy: each line counts as a line, as on the shipped dish', async () => {
    expect((await keep('oeufs-a-la-neige')).characters).toContain('eggy');
  });
});

describe('controls', () => {
  // These copies were judged like their shipped dish on f4f9f59 too.
  test('copies that were right before stay right: gratin, ratatouille, chana masala', async () => {
    for (const id of ['gratin-dauphinois', 'ratatouille', 'chana-masala']) {
      expect((await keep(id)).characters, id).toEqual(shippedCharacters(must(classicOf(id))));
    }
  });

  // An origin is history: a copy the cook changed is judged by what is in it.
  test('a kept pizza without its cheese is not cheesy, though it was kept from the pizza', async () => {
    const copy = await keep('pizza-margherita');
    const head = must(listDishes().find((d) => `own:${d.id}` === copy.key));
    const changed: DishRecord = { ...head, slots: head.slots.filter((s) => s.role !== 'main') };
    const next = asNextVersion(changed, false, { change: 'no cheese' }, 'u-next', '2026-11-24');
    expect((await saveRecord('dishes', next)).ok).toBe(true);
    const entry = must(dishEntriesByKey().get(`own:${next.id}`));
    expect(entry.copyOf).toBe('pizza-margherita');
    expect(entry.characters).not.toContain('cheesy');
    expect(shippedCharacters(must(classicOf('pizza-margherita')))).toContain('cheesy');
  });
});

// "Dishes like this" reads the characters: a kept copy now finds what its shipped dish finds, and
// never its shipped dish (`sameDish`).
test('a kept copy is like the dishes its shipped dish is like, and never like that dish', async () => {
  for (const id of ['gratin-dauphinois', 'tamagoyaki', 'souvlaki-plate']) {
    reset();
    await startNotebook({ indexedDB: freshFactory(), now: () => '2026-11-24T08:00:00.000Z' });
    const copy = await keep(id);
    const shipped = must(dishEntriesByKey().get(`shipped:${id}`));
    const others = dishEntries().filter((e) => e.origin === 'shipped');
    const fromCopy = dishesLike(copy, others).map((a) => a.entry.key);
    expect(fromCopy, id).not.toContain(shipped.key);
    expect(dishesLike(shipped, [copy]), id).toEqual([]);
    expect(fromCopy, id).toEqual(dishesLike(shipped, others).map((a) => a.entry.key));
  }
});

// The nutrition of an own dish adds up the same slots (`dishRaw`, `expandSlot`): on f4f9f59 a
// copy's component slots were "not added up", and no copy showed figures. Not proved here: the
// 17 copies whose figures stay hidden because the notebook weighs a spoon or a piece of a group
// otherwise than the shipped dish (docs/dish-characters.md), and the screen itself.
test('the nutrition of a kept dish is the shipped dish’s: tamagoyaki, köfte, souvlaki plate, set meal', async () => {
  const ctx = {
    lang: 'en' as const,
    nameOf: (id: string) => id,
    lookup: characterLookup,
    known: [],
    learned: new Set<string>(),
  };
  const figures = (rows: readonly { key: string; value: string }[]) =>
    rows.map((r) => `${r.key} ${r.value}`);
  for (const id of ['tamagoyaki', 'kofte', 'souvlaki-plate', 'teishoku']) {
    const classic = must(classicOf(id));
    const done = await keepClassic(classic, 2, 'en');
    if (!done.ok) throw new Error(id);
    const copy = must(listDishes().find((d) => d.id === done.dishId));
    const own = shownOfDish(notebook(), copy, 2, ctx, { fromStock: (n) => n });
    const shipped = shownOfClassic(asChosen(classic), 2, ctx);
    if (!shipped.ok || !own.nutrition.ok || !shipped.dish.nutrition.ok) throw new Error(id);
    expect(own.nutrition.view.rows.length, id).toBeGreaterThan(0);
    expect(figures(own.nutrition.view.rows), id).toEqual(figures(shipped.dish.nutrition.view.rows));
  }
});

// A copy kept since 2026-11-24 stores a slot's amount per portion, as a dish record is read
// (`copyClassic`); before, it stored the total for the copy's portions, and the kept pizza for 2
// showed 250 g of mozzarella where the shipped one has 125 g. Compared here on the stored numbers,
// for every file kept at 2 and 4 portions and every frame filling, shown at 1, 3 and the kept
// portions: each ingredient slot's total (amount per portion x portions) and each line of a
// component a slot without an amount stands for (its runs x the line) against the shipped dish
// derived for those portions. Not proved here: the words and rounding of the page (the same
// `formatMass` for both), a copy kept before the fix (it keeps its stored totals).
describe('a copy kept unchanged has the amounts, lines and steps of its shipped dish at any portions', () => {
  const near = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-6 * Math.max(1, b);
  const differences = (classic: Classic, copy: DishRecord): string[] => {
    const out: string[] = [];
    const nb = notebook();
    for (const p of [1, 3, copy.portions ?? 1]) {
      const derived = deriveClassic(asChosen(classic), { portions: p, lang: 'en' });
      if (!derived.ok) throw new Error(classic.id);
      const rows = slotRows(nb, copy, p);
      derived.dish.slots.forEach((slot, i) => {
        const mine = copy.slots[i];
        const row = rows[i];
        if (mine === undefined || row === undefined) {
          out.push(`${classic.id}: slot ${i}`);
          return;
        }
        if (slot.ref?.kind === 'ingredient') {
          const total = mine.amount === undefined ? undefined : mine.amount.value * p;
          const same =
            slot.amount === undefined
              ? total === undefined
              : total !== undefined &&
                near(total, slot.amount.value) &&
                slot.amount.unit === mine.amount?.unit;
          if (!same) out.push(`${classic.id} at ${p}: slot ${i} ${total} / ${slot.amount?.value}`);
          return;
        }
        const component = nb.components.find((c) => c.id === mine.ref.id);
        const shipped = derived.components.find((c) => c.id === slot.ref?.id);
        const runs = row.runs;
        if (component === undefined || shipped === undefined || runs === undefined) {
          out.push(`${classic.id} at ${p}: slot ${i} is not one run`);
          return;
        }
        shipped.lines.forEach((line, j) => {
          const value = component.lines[j]?.amount?.value;
          if (line.amount === undefined || value === undefined) return;
          if (!near(value * runs, line.amount.value))
            out.push(`${classic.id} at ${p}: ${shipped.id} line ${j}`);
        });
      });
      // What the page and the cook screen show (`dishParts`): every component of the shipped
      // dish, nested ones too, with as many lines and steps, and each line in grams at the
      // shipped dish's grams for these portions (a line in ml or pieces is shown in grams on a
      // copy and is not compared here).
      const parts = dishParts(nb, copy, p, { fromStock: (n) => n }).filter(
        (part) => part.componentId !== undefined,
      );
      const names = (list: readonly { name: string }[]) => list.map((c) => c.name).sort();
      if (names(parts).join('|') !== names(derived.components).join('|'))
        out.push(`${classic.id} at ${p}: parts ${names(parts).join(', ')}`);
      for (const shipped of derived.components) {
        const part = parts.find((x) => x.name === shipped.name);
        const source = (asChosen(classic).components ?? []).find((c) => c.id === shipped.id);
        if (part === undefined) continue;
        if (part.steps.length !== (source?.steps ?? []).length)
          out.push(`${classic.id} at ${p}: ${shipped.id} steps`);
        if (part.lines.length !== shipped.lines.length)
          out.push(`${classic.id} at ${p}: ${shipped.id} lines`);
        shipped.lines.forEach((line, j) => {
          if (line.amount?.unit !== 'g') return;
          const shown = part.lines[j]?.amount;
          if (shown !== formatMass(line.amount.value, 'g'))
            out.push(
              `${classic.id} at ${p}: ${shipped.id} line ${j} ${shown} / ${line.amount.value} g`,
            );
        });
      }
    }
    return out;
  };

  test(
    'every shipped file at 2 and 4 portions, and every frame filling',
    { timeout: 60_000 },
    async () => {
      const differ: string[] = [];
      const keepAndCompare = async (classic: Classic, portions: number): Promise<void> => {
        const done = await keepClassic(withChoices(classic), portions, 'en');
        if (!done.ok) return;
        differ.push(...differences(classic, must(listDishes().find((d) => d.id === done.dishId))));
      };
      for (const classic of classics()) {
        for (const portions of [2, 4]) await keepAndCompare(classic, portions);
        for (const [index, slot] of classic.slots.entries()) {
          for (const other of slotAlternatives(classic, slot)) {
            resetChoices();
            chooseFilling(classic, index, other.id);
            await keepAndCompare(classic, 2);
          }
        }
        resetChoices();
      }
      // One named exception, open (docs/dish-characters.md): the green beans in butter name
      // 500 g of boiled beans, a component without a yield whose run holds the boiling water,
      // which a run is not weighed by; its part is shown as written, one run, with the reason
      // (the next test), so it differs at portions other than the copy's own.
      const beans = differ.filter((d) => d.startsWith('haricots-verts-beurre at '));
      expect(differ.filter((d) => !beans.includes(d))).toEqual([]);
      expect(
        beans.every((d) => /^haricots-verts-beurre at [13]: haricots-verts-boiled line /.test(d)),
      ).toBe(true);
    },
  );

  test('the kept green beans in butter show their boiled beans as written, and say why', async () => {
    const done = await keepClassic(must(classicOf('haricots-verts-beurre')), 2, 'en');
    if (!done.ok) throw new Error('beans');
    const copy = must(listDishes().find((d) => d.id === done.dishId));
    const nb = notebook();
    for (const p of [2, 4]) {
      const parts = dishParts(nb, copy, p, { fromStock: (n) => n });
      const boiled = parts.find((x) => x.lines.some((l) => /water/i.test(l.name)));
      // The run holds kitchen water: the sentence about the output, then "one run as written".
      const why = stringsEn.notebook.problem.noYield(boiled?.name ?? '');
      expect(boiled?.note, `at ${p}`).toBe(`${why} ${stringsEn.notebook.rawAsWritten}`);
      // One run as written: the 250 g of the copy kept for 2, at any portions, never 36 g.
      expect(boiled?.lines[0]?.amount, `at ${p}`).toBe('250 g');
      // Every step of it on the cook screen carries the same note where its amounts are read.
      const steps = dishCookView(nb, copy, p, 'en', [], new Set(), { fromStock: (n) => n });
      const ofBoiled = steps.filter((s) => s.component === boiled?.name);
      expect(ofBoiled.length, `at ${p}`).toBeGreaterThan(0);
      expect(
        ofBoiled.every((s) => s.amountsNote === boiled?.note),
        `at ${p}`,
      ).toBe(true);
      expect(
        steps.filter((s) => s.component !== boiled?.name).every((s) => s.amountsNote === undefined),
      ).toBe(true);
      const raw = dishRaw(nb, slotRows(nb, copy, p));
      expect(raw.skipped.map((x) => x.why)).toEqual([
        stringsEn.notebook.problem.noYield(boiled?.name ?? ''),
      ]);
    }
  });

  test('the kept pizza for 2 has 125 g of mozzarella in all, as the shipped pizza for 2', async () => {
    const done = await keepClassic(must(classicOf('pizza-margherita')), 2, 'en');
    if (!done.ok) throw new Error('pizza');
    const copy = must(listDishes().find((d) => d.id === done.dishId));
    const cheese = slotRows(notebook(), copy, 2).find((r) => r.role === 'main');
    expect(cheese?.totalG).toBe(125);
  });
});

// The nutrition of every copy kept unchanged against its shipped dish at the same portions. The
// copies that still differ are named, each for its reason in docs/dish-characters.md: 14 because
// the nutrition of an own dish weighs a spoon or a piece of a group by the notebook's own figures
// (a decision of 2026-11-21), 3 (salsa-de-tomate, haricots-verts-beurre, sauce-maitre-d-hotel)
// because their lines without an amount reach it by name only; these show no figures where the
// shipped dish shows some. Every other copy shows the shipped figures, or none as it shows none.
const STILL_HIDDEN = [
  'patatas-bravas',
  'salsa-de-tomate',
  'tortilla-de-patatas',
  'haricots-verts-beurre',
  'macaroni-a-l-italienne-maigre',
  'mayonnaise',
  'oeufs-a-la-neige',
  'omelette-fines-herbes',
  'pommes-de-terre-au-lait',
  'sauce-hollandaise',
  'sauce-maitre-d-hotel',
  'souffle-parmesan',
  'soupe-aux-poireaux',
  'crema-cotta',
  'gnocchi-di-semolino',
  'latte-brule',
  'passato-di-patate',
];

test(
  'the nutrition of every copy kept unchanged is its shipped dish’s, but 17 named',
  { timeout: 60_000 },
  async () => {
    const ctx = {
      lang: 'en' as const,
      nameOf: (id: string) => id,
      lookup: characterLookup,
      known: [],
      learned: new Set<string>(),
    };
    const figures = (rows: readonly { key: string; value: string }[]) =>
      rows.map((r) => `${r.key} ${r.value}`).join(', ');
    const differ: string[] = [];
    for (const classic of classics()) {
      for (const portions of [2, 4]) {
        const done = await keepClassic(classic, portions, 'en');
        if (!done.ok) continue;
        const copy = must(listDishes().find((d) => d.id === done.dishId));
        const own = shownOfDish(notebook(), copy, portions, ctx, { fromStock: (n) => n }).nutrition;
        const shipped = shownOfClassic(asChosen(classic), portions, ctx);
        if (!shipped.ok || !own.ok || !shipped.dish.nutrition.ok) throw new Error(classic.id);
        const a = figures(shipped.dish.nutrition.view.rows);
        const b = figures(own.view.rows);
        if (a !== b) differ.push(`${classic.id} at ${portions}: ${a || 'none'} / ${b || 'none'}`);
      }
    }
    const named = STILL_HIDDEN.flatMap((id) => [`${id} at 2`, `${id} at 4`]);
    expect(differ.map((d) => d.split(':')[0]).sort()).toEqual(named.sort());
    expect(differ.every((d) => d.endsWith('/ none'))).toBe(true);
  },
);
