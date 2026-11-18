// The version model in the notebook: Save, Restore, Make a variation and tasting notes only ever
// add records; a stored version record is never put again (a store spy proves it).
import { beforeEach, expect, test } from 'vitest';
import { asNextVersion } from '../src/editor/version-save';
import {
  allTastings,
  getComponent,
  headOfFamily,
  listComponents,
  listDishes,
  makeVariation,
  notebook,
  numberOf,
  parentOf,
  removeFamily,
  restoreFamily,
  restoreVersion,
  saveRecord,
  saveTasting,
  startNotebook,
  tastingsOf,
  variationsFor,
} from '../src/notebook';
import { state } from '../src/notebook/state';
import type { ComponentRecord, DishRecord } from '../src/records';
import { diffRows } from '../src/versions/diff-text';
import { historyEntries, isDate } from '../src/versions/history';
import { freshFactory } from './store-helpers';
import { must } from './must';

let clock = 0;
const NOW = () => `2026-11-${String(18 + clock).padStart(2, '0')}T08:00:00.000Z`;
let ids = 0;
const nextId = () => `u-00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`;

const puts: { kind: string; id: string }[] = [];

beforeEach(async () => {
  clock = 0;
  ids = 0;
  puts.length = 0;
  await startNotebook({ indexedDB: freshFactory(), now: NOW, newId: nextId });
  const store = must(state.store);
  const put = store.put.bind(store);
  store.put = (kind, record) => {
    puts.push({ kind, id: (record as { id: string }).id });
    return put(kind, record);
  };
});

const first = (name: string, grams: number): ComponentRecord => {
  const id = nextId();
  return {
    id,
    name,
    lines: [{ ref: { kind: 'ingredient', id: 'salt' }, amount: { value: grams, unit: 'g' } }],
    version: { family: id, date: '2026-11-18' },
  };
};

/** What the editor's Save does for a changed copy of the head. */
const saveChanged = async (head: ComponentRecord, grams: number, change?: string) => {
  clock += 1;
  const edited = {
    ...head,
    lines: [{ ...must(head.lines[0]), amount: { value: grams, unit: 'g' as const } }],
  };
  const record = asNextVersion(edited, false, change ? { change } : {}, nextId(), '2026-11-19');
  expect((await saveRecord('components', record)).ok).toBe(true);
  return record;
};

const seenOnce = () => {
  const keys = puts.filter((p) => p.kind === 'components' || p.kind === 'dishes').map((p) => p.id);
  expect(new Set(keys).size, `a version record was put twice: ${keys.join(', ')}`).toBe(
    keys.length,
  );
};

test('Save appends: the head moves, the older records are never put again', async () => {
  const v1 = first('Sauce', 5);
  expect((await saveRecord('components', v1)).ok).toBe(true);
  const v2 = await saveChanged(v1, 6, 'More salt');
  const v3 = await saveChanged(v2, 7);
  expect(v2.version).toMatchObject({ family: v1.id, parent: v1.id, change: 'More salt' });
  expect(v3.version).toMatchObject({ family: v1.id, parent: v2.id });
  expect(listComponents().map((c) => c.id)).toEqual([v3.id]);
  expect(numberOf('components', v1.id)).toBe(1);
  expect(numberOf('components', v3.id)).toBe(3);
  expect(getComponent(v1.id)?.lines[0]?.amount?.value).toBe(5);
  seenOnce();
});

test('a stored version record is refused when put again', async () => {
  const v1 = first('Sauce', 5);
  await saveRecord('components', v1);
  const again = await saveRecord('components', { ...v1, name: 'Changed' });
  expect(again.ok === false && again.error.code).toBe('invalid-record');
  expect(getComponent(v1.id)?.name).toBe('Sauce');
  expect(puts).toHaveLength(1);
});

test('Restore adds a new head equal to the old version, parent the previous head', async () => {
  const v1 = first('Sauce', 5);
  await saveRecord('components', v1);
  const v2 = await saveChanged(v1, 6);
  const v3 = await saveChanged(v2, 7);
  const done = await restoreVersion('components', v1.id, 'Restored version 1');
  const restored = must(done.ok ? getComponent(done.id) : undefined);
  expect(restored.lines).toEqual(v1.lines);
  expect(restored.version).toMatchObject({
    family: v1.id,
    parent: v3.id,
    change: 'Restored version 1',
  });
  expect(numberOf('components', restored.id)).toBe(4);
  expect(headOfFamily('components', v1.id)?.id).toBe(restored.id);
  expect((await restoreVersion('components', restored.id, 'x')).ok).toBe(false);
  seenOnce();
});

test('a variation is a new family; the link works both ways and survives the parent', async () => {
  const v1 = first('Sauce', 5);
  await saveRecord('components', v1);
  const v2 = await saveChanged(v1, 6);
  const made = await makeVariation('components', v2.id, 'Sauce (variation)');
  const variation = must(made.ok ? getComponent(made.id) : undefined);
  expect(variation.version).toMatchObject({ family: variation.id, parent: v2.id });
  expect(variationsFor('components', v1.id).map((v) => v.head.id)).toEqual([variation.id]);
  const parent = parentOf('components', variation.id);
  expect(parent.kind === 'parent' && parent.record.id).toBe(v2.id);
  expect(listComponents()).toHaveLength(2);
  const removed = await removeFamily('components', v1.id);
  expect(removed.ok).toBe(true);
  expect(parentOf('components', variation.id).kind).toBe('removed');
  expect(listComponents().map((c) => c.id)).toEqual([variation.id]);
  seenOnce();
});

test('tasting notes are records of their own: added and edited later, version untouched', async () => {
  const v1 = first('Sauce', 5);
  await saveRecord('components', v1);
  const note = {
    id: nextId(),
    ref: { kind: 'component' as const, id: v1.id },
    date: '2026-11-18',
    text: 'Fine',
  };
  expect((await saveTasting(note)).ok).toBe(true);
  expect((await saveTasting({ ...note, text: 'Fine, a bit flat' })).ok).toBe(true);
  expect(tastingsOf(v1.id).map((t) => t.text)).toEqual(['Fine, a bit flat']);
  expect(puts.filter((p) => p.id === v1.id)).toHaveLength(1);
  seenOnce();
});

test('deleting a family tombstones every version and note; Undo brings them all back', async () => {
  const v1 = first('Sauce', 5);
  await saveRecord('components', v1);
  const v2 = await saveChanged(v1, 6);
  await saveTasting({
    id: nextId(),
    ref: { kind: 'component', id: v1.id },
    date: '2026-11-18',
    text: 'Note',
  });
  const done = await removeFamily('components', v2.id);
  const removed = must(done.ok ? done.removed : undefined);
  expect(removed.versions.map((v) => v.id)).toEqual([v1.id, v2.id]);
  expect(listComponents()).toEqual([]);
  expect(allTastings()).toEqual([]);
  const rows = must(state.store);
  const listed = await rows.listRows('components');
  expect(listed.ok && listed.rows.every((r) => r.deleted === true)).toBe(true);
  expect((await restoreFamily(removed)).ok).toBe(true);
  expect(listComponents().map((c) => c.id)).toEqual([v2.id]);
  expect(tastingsOf(v1.id)).toHaveLength(1);
});

test('a reference to any version of a component resolves to the head of its family', async () => {
  const sub1 = first('Stock', 5);
  await saveRecord('components', sub1);
  const user = first('Soup', 1);
  const withSub = {
    ...user,
    lines: [
      {
        ref: { kind: 'component' as const, id: sub1.id },
        amount: { value: 100, unit: 'g' as const },
      },
    ],
  };
  await saveRecord('components', withSub);
  const sub2 = await saveChanged(sub1, 6);
  const alias = notebook().components;
  expect(alias.find((c) => c.id === sub1.id)?.lines[0]?.amount?.value).toBe(6);
  expect(alias.find((c) => c.id === sub2.id)?.lines[0]?.amount?.value).toBe(6);
  // The version on screen keeps its own content under its own id.
  expect(notebook(sub1).components.find((c) => c.id === sub1.id)?.lines[0]?.amount?.value).toBe(5);
  expect(listDishes()).toEqual([]);
});

test('history lists newest first with the diff to the version before and the notes', async () => {
  const v1 = first('Sauce', 5);
  await saveRecord('components', v1);
  const v2 = await saveChanged(v1, 6);
  await saveTasting({
    id: nextId(),
    ref: { kind: 'component', id: v2.id },
    date: '2026-11-19',
    text: 'Rounder',
  });
  const entries = historyEntries('components', state.components, state.tastings, v1.id);
  expect(entries.map((e) => [e.number, e.isHead])).toEqual([
    [2, true],
    [1, false],
  ]);
  expect(entries[1]?.diff).toBeUndefined();
  expect(entries[0]?.notes.map((n) => n.text)).toEqual(['Rounder']);
  const rows = diffRows(notebook(), must(entries[0]?.diff), false);
  expect(rows).toEqual([{ kind: 'changed', text: 'Changed: salt, 5 g → salt, 6 g (amount)' }]);
});

test('dishes version the same way', async () => {
  const id = nextId();
  const dish: DishRecord = {
    id,
    name: 'Plate',
    portions: 2,
    slots: [{ role: 'main', ref: { kind: 'ingredient', id: 'salt' } }],
    version: { family: id, date: '2026-11-18' },
  };
  await saveRecord('dishes', dish);
  const v2 = asNextVersion(
    { ...dish, portions: 4 },
    false,
    { reason: 'Guests' },
    nextId(),
    '2026-11-19',
  );
  expect((await saveRecord('dishes', v2)).ok).toBe(true);
  expect(listDishes().map((d) => d.id)).toEqual([v2.id]);
  expect(v2.version).toMatchObject({ family: id, parent: id, reason: 'Guests' });
  seenOnce();
});

test('dates for a tasting note must be real days', () => {
  expect(isDate('2026-11-18')).toBe(true);
  expect(isDate('2026-02-30')).toBe(false);
  expect(isDate('18.11.2026')).toBe(false);
});
