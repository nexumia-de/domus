// A frame kept in the notebook is still a frame where the lists read it (docs/behaviour.md, Cook):
// its entry says so and carries the frame's parts (which "Dishes like this" reads), and Cook's
// groups put it under "Put together" beside the shipped frame. The copy stores no frame mark; the
// entry reads it from the shipped dish the copy was kept from (`x-origin.classic`), so a frame kept
// before this change comes right without a migration. On the real shipped files and catalogue, a
// fake IndexedDB. Not proved here: a browser (e2e/cook-groups.mjs); a notebook kept on a real
// device; that "Dishes like this" of a kept frame changes (no kept frame has a like dish today, with
// or without the parts); a copy whose shipped frame was later removed from the app (it then stands
// in its course, as any own dish).
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dishEntries, dishEntriesByKey } from '../src/browse/entries';
import { groupRows } from '../src/browse/groups';
import { dishListView } from '../src/browse/list-view';
import { resetCatalogue } from '../src/catalogue/load';
import { classicOf, loadContent, resetContent } from '../src/classics/content';
import { keepClassic } from '../src/classics/keep';
import { loadNames } from '../src/classics/names';
import { formFromRecord, formToRecord } from '../src/editor/component-form';
import { dishFormFromRecord, dishFormToRecord } from '../src/editor/dish-form';
import { asNextVersion } from '../src/editor/version-save';
import { listComponents, listDishes, saveRecord, startNotebook } from '../src/notebook';
import type { DishRecord } from '../src/records';
import { reset } from '../src/notebook/state';
import { shippedContent } from '../make-classics.mjs';
import { freshFactory } from './store-helpers';
import { must } from './must';

const NOW = '2026-11-24T08:00:00.000Z';
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
  await startNotebook({ indexedDB: freshFactory(), now: () => NOW });
  await load();
});
afterAll(() => {
  reset();
  resetContent();
  resetCatalogue();
  vi.unstubAllGlobals();
});

/** Keeps a shipped dish and gives the entry of the copy. */
const keep = async (id: string) => {
  const done = await keepClassic(must(classicOf(id)), 4, 'en');
  expect(done.ok).toBe(true);
  const dishId = must(listDishes()[0]).id;
  return must(dishEntriesByKey().get(`own:${dishId}`));
};

/** The id of the group each entry stands in, by key. */
const groupOfKey = (): Map<string, string> => {
  const groups = groupRows(dishListView(dishEntries(), {}, '', 'en').rows) ?? [];
  return new Map(groups.flatMap((g) => g.rows.map((r) => [r.entry.key, g.id] as const)));
};

test('the kept tacos are a frame with their parts, and stand under "Put together"', async () => {
  const copy = await keep('tacos');
  const shipped = must(dishEntriesByKey().get('shipped:tacos'));
  expect(copy.origin).toBe('own');
  expect(copy.frame).toBe(true);
  expect(copy.course).toBe('main');
  expect(copy.parts).toEqual(shipped.parts);
  expect(groupOfKey().get(copy.key)).toBe('frames');
  expect(groupOfKey().get('shipped:tacos')).toBe('frames');
});

// The control: a kept dish that is no frame stays in its course, before and after.
test('a kept dish that is no frame stands in its course', async () => {
  const copy = await keep('gratin-dauphinois');
  expect(copy.frame).toBeUndefined();
  expect(copy.parts).toBeUndefined();
  expect(groupOfKey().get(copy.key)).toBe(must(classicOf('gratin-dauphinois')).course);
});

// The notebook's entries are kept while the notebook is the same: they must be made again once the
// shipped content is there, or a copy read before it loaded would stay out of its group.
test('a kept frame read before the shipped content loads is a frame once it has', async () => {
  const done = await keepClassic(must(classicOf('tacos')), 4, 'en');
  expect(done.ok).toBe(true);
  const key = `own:${must(listDishes()[0]).id}`;
  resetContent();
  expect(dishEntriesByKey().get(key)?.frame).toBeUndefined();
  await load();
  expect(dishEntriesByKey().get(key)?.frame).toBe(true);
});

/** Saves the next version of a dish, as the dish editor's Save does (src/screens/editor). */
const saveNext = async (record: DishRecord): Promise<string> => {
  const next = asNextVersion(
    record,
    false,
    { change: 'edited' },
    `u-next-${record.id}`,
    '2026-11-24',
  );
  expect((await saveRecord('dishes', next)).ok).toBe(true);
  return next.id;
};

// The editor carries what it does not edit: the copy's origin is a fact of the dish.
test('an edit in the dish editor keeps the origin of a kept dish', async () => {
  const copy = await keep('tacos');
  const head = must(listDishes().find((d) => `own:${d.id}` === copy.key));
  const built = dishFormToRecord(dishFormFromRecord(head), '2026-11-24');
  expect(built.ok).toBe(true);
  const record = (built as { ok: true; record: DishRecord }).record;
  expect((record as unknown as Record<string, unknown>)['x-origin']).toEqual(
    (head as unknown as Record<string, unknown>)['x-origin'],
  );
  const id = await saveNext(record);
  expect(dishEntriesByKey().get(`own:${id}`)?.frame).toBe(true);
  expect(groupOfKey().get(`own:${id}`)).toBe('frames');
});

// A version saved by the editor before 2026-11-24 has no origin; the version that was kept still
// has it, and the family is read by it. Nothing stored is rewritten.
test('a kept frame edited before the editor kept the origin is still among the frames', async () => {
  const copy = await keep('tacos');
  const head = must(listDishes().find((d) => `own:${d.id}` === copy.key));
  const lost = { ...head } as Record<string, unknown>;
  delete lost['x-origin'];
  const id = await saveNext(lost as unknown as DishRecord);
  const stored = must(listDishes().find((d) => d.id === id));
  expect((stored as unknown as Record<string, unknown>)['x-origin']).toBeUndefined();
  expect(dishEntriesByKey().get(`own:${id}`)?.frame).toBe(true);
  expect(groupOfKey().get(`own:${id}`)).toBe('frames');
});

// The same for a component: its origin names the recipe it was taken from.
test('an edit in the component editor keeps the origin of a kept component', async () => {
  await keep('tacos');
  const part = must(listComponents()[0]);
  const origin = (part as unknown as Record<string, unknown>)['x-origin'];
  expect(origin).toBeDefined();
  const built = formToRecord(formFromRecord(part), '2026-11-24');
  expect(built.ok).toBe(true);
  const record = (built as { ok: true; record: object }).record as Record<string, unknown>;
  expect(record['x-origin']).toEqual(origin);
});
