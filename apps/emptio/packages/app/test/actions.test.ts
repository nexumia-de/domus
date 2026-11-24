// What a person does to the list, against the shared database in memory. The
// clock is injected and the store is not IndexedDB; a browser runs in e2e/.
import { describe, expect, test } from 'vitest';
import { localChange } from '@nexumia-de/hospes';
import {
  addCategory,
  addToList,
  clearBought,
  editEntry,
  removeCategory,
  removeEntries,
  renameCategory,
  restoreEntries,
  setBought,
  setCategoryHidden,
  setPriority,
} from '../src/list/actions';
import { LIST, entriesOf } from '@nexumia-de/list';
import { CATEGORIES, categoryChangesOf } from '../src/list/model';
import { deps, now, putSpace } from './helpers';

async function fresh() {
  const d = deps();
  const space = await putSpace(d.store, 's1', 'Home');
  const entries = async () => entriesOf((await d.store.readCollection(space, LIST)).records);
  const changes = async () =>
    categoryChangesOf((await d.store.readCollection(space, CATEGORIES)).records);
  return { d, space, entries, changes };
}

describe('adding', () => {
  test('a new entry is typed, soon, and in the category of the usual item it names, with its name tidied', async () => {
    const { d, space, entries } = await fresh();
    expect(await addToList(d, space, { name: '  Oat   milk ' })).toEqual({
      id: 'e1',
      joined: false,
    });
    expect(await entries()).toEqual([
      {
        id: 'e1',
        name: 'Oat milk',
        categoryId: 'dairy',
        priority: 'soon',
        addedAt: expect.stringMatching(/^2026-11-20T09:00:00\.\d{3}Z$/) as string,
        origins: [{ kind: 'typed' }],
      },
    ]);
  });

  test('an empty name adds nothing', async () => {
    const { d, space, entries } = await fresh();
    expect(await addToList(d, space, { name: '   ' })).toBeNull();
    expect(await entries()).toEqual([]);
  });

  test('what is already open is raised: one entry, the more pressing priority, both amounts', async () => {
    const { d, space, entries } = await fresh();
    await addToList(d, space, { name: 'Milk', amount: '1 l', priority: 'sometime' });
    expect(await addToList(d, space, { name: 'milk', amount: '2 l', priority: 'now' })).toEqual({
      id: 'e1',
      joined: true,
    });
    expect(await entries()).toMatchObject([
      { id: 'e1', name: 'Milk', amount: '1 l + 2 l', priority: 'now' },
    ]);
  });

  test('a bought entry is not raised, and gives the new one its category', async () => {
    const { d, space, entries } = await fresh();
    await addToList(d, space, { name: 'Batteries', categoryId: 'household' });
    await setBought(d, space, 'e1', true);
    expect(await addToList(d, space, { name: 'batteries' })).toEqual({ id: 'e2', joined: false });
    expect(await entries()).toMatchObject([
      { id: 'e1', bought: { at: expect.any(String) as string } },
      { id: 'e2', name: 'batteries', categoryId: 'household' },
    ]);
  });

  test('the join is worked out from what is stored at that moment, not from an earlier read', async () => {
    // Another tab or a sync cycle put the same thing on the list after this screen read it.
    const { d, space, entries } = await fresh();
    await localChange(d.store, space, LIST, now, () => ({
      put: [
        {
          key: 'from-elsewhere',
          value: {
            name: 'Eggs',
            categoryId: 'dairy',
            priority: 'soon',
            addedAt: '2026-11-20T08:00:00Z',
            origins: [{ kind: 'typed' }],
          },
        },
      ],
    }));
    expect(await addToList(d, space, { name: 'eggs', priority: 'now' })).toEqual({
      id: 'from-elsewhere',
      joined: true,
    });
    expect(await entries()).toHaveLength(1);
  });
});

describe('an entry', () => {
  test('ticking writes when it was bought, ticking again removes it', async () => {
    const { d, space, entries } = await fresh();
    await addToList(d, space, { name: 'Bread' });
    expect(await setBought(d, space, 'e1', true)).toBe(true);
    expect((await entries())[0]?.bought?.at).toMatch(/^2026-11-20T09:00:00\.\d{3}Z$/);
    // A second tick of what is already ticked changes nothing (no new time).
    expect(await setBought(d, space, 'e1', true)).toBe(false);
    expect(await setBought(d, space, 'e1', false)).toBe(true);
    expect((await entries())[0]).not.toHaveProperty('bought');
  });

  test('editing replaces the fields of the form and removes an emptied amount and note', async () => {
    const { d, space, entries } = await fresh();
    await addToList(d, space, { name: 'Rice', amount: '1 kg', note: 'basmati' });
    await editEntry(d, space, 'e1', {
      name: ' Rice, brown ',
      amount: ' ',
      note: '',
      priority: 'now',
      categoryId: 'pantry',
    });
    const [entry] = await entries();
    expect(entry).toMatchObject({ name: 'Rice, brown', priority: 'now', categoryId: 'pantry' });
    expect(entry).not.toHaveProperty('amount');
    expect(entry).not.toHaveProperty('note');
  });

  test('an edit with an empty name, or of an entry that is gone, changes nothing', async () => {
    const { d, space, entries } = await fresh();
    await addToList(d, space, { name: 'Rice' });
    const edit = {
      name: ' ',
      amount: '',
      note: '',
      priority: 'soon',
      categoryId: 'other',
    } as const;
    expect(await editEntry(d, space, 'e1', edit)).toBe(false);
    expect(await editEntry(d, space, 'nobody', { ...edit, name: 'x' })).toBe(false);
    expect(await setPriority(d, space, 'nobody', 'now')).toBe(false);
    expect(await entries()).toMatchObject([{ name: 'Rice' }]);
  });

  test('fields this app does not know are kept through every change', async () => {
    const { d, space } = await fresh();
    await localChange(d.store, space, LIST, now, () => ({
      put: [
        {
          key: 'x1',
          value: {
            name: 'Cream',
            categoryId: 'dairy',
            priority: 'soon',
            addedAt: '2026-11-20T08:00:00Z',
            origins: [{ kind: 'typed' }],
            'x-offer': { price: '0.99' },
          },
        },
      ],
    }));
    await setBought(d, space, 'x1', true);
    await setPriority(d, space, 'x1', 'now');
    await addToList(d, space, { name: 'cream', amount: '200 ml' });
    await setBought(d, space, 'x1', false);
    const record = (await d.store.readCollection(space, LIST)).records.find((r) => r.key === 'x1');
    expect(record?.value).toEqual({
      name: 'Cream',
      categoryId: 'dairy',
      priority: 'now',
      addedAt: '2026-11-20T08:00:00Z',
      origins: [{ kind: 'typed' }],
      'x-offer': { price: '0.99' },
    });
  });

  test('a record that is no entry is not shown and not touched', async () => {
    const { d, space, entries } = await fresh();
    await localChange(d.store, space, LIST, now, () => ({
      put: [
        { key: 'bad1', value: { name: 'No priority', categoryId: 'other' } },
        { key: 'bad2', value: 'text' },
      ],
    }));
    expect(await entries()).toEqual([]);
    expect(await setBought(d, space, 'bad1', true)).toBe(false);
    expect(await clearBought(d, space)).toEqual([]);
    const { records } = await d.store.readCollection(space, LIST);
    expect(records.map((r) => r.value)).toEqual([
      { name: 'No priority', categoryId: 'other' },
      'text',
    ]);
  });
});

describe('removing', () => {
  test('clearing removes the bought entries as stored now and Undo puts them back', async () => {
    const { d, space, entries } = await fresh();
    await addToList(d, space, { name: 'Bread' });
    await addToList(d, space, { name: 'Salt' });
    await addToList(d, space, { name: 'Tea' });
    await setBought(d, space, 'e1', true);
    await setBought(d, space, 'e3', true);
    const removed = await clearBought(d, space);
    expect(removed.map((e) => e.name)).toEqual(['Bread', 'Tea']);
    expect((await entries()).map((e) => e.name)).toEqual(['Salt']);
    // The removed records stay as removal markers, so another device learns of it.
    const { records } = await d.store.readCollection(space, LIST);
    expect(records.filter((r) => r.deleted === true).map((r) => r.key)).toEqual(['e1', 'e3']);
    await restoreEntries(d, space, removed);
    expect((await entries()).map((e) => e.name).sort()).toEqual(['Bread', 'Salt', 'Tea']);
    expect((await entries()).find((e) => e.id === 'e1')?.bought).toBeDefined();
  });

  test('Undo does not overwrite an entry that is live again', async () => {
    const { d, space, entries } = await fresh();
    await addToList(d, space, { name: 'Bread' });
    const [bread] = await entries();
    await removeEntries(d, space, ['e1']);
    await restoreEntries(d, space, bread ? [bread] : []);
    await setPriority(d, space, 'e1', 'now');
    await restoreEntries(d, space, bread ? [bread] : []);
    expect(await entries()).toMatchObject([{ id: 'e1', priority: 'now' }]);
  });
});

describe('categories', () => {
  test('an own category is made, renamed and removed', async () => {
    const { d, space, changes } = await fresh();
    const id = await addCategory(d, space, ' Garden ');
    expect(id).toBe('e1');
    expect(await addCategory(d, space, '  ')).toBeNull();
    await renameCategory(d, space, 'e1', 'Garten', false);
    // An own category cannot lose its name.
    await renameCategory(d, space, 'e1', '', false);
    expect(await changes()).toEqual([{ id: 'e1', name: 'Garten' }]);
    await removeCategory(d, space, 'e1');
    expect(await changes()).toEqual([]);
  });

  test('a starting category that is as shipped again has no record', async () => {
    const { d, space, changes } = await fresh();
    await setCategoryHidden(d, space, 'baby', true);
    await renameCategory(d, space, 'baby', 'Kids', true);
    expect(await changes()).toEqual([{ id: 'baby', name: 'Kids', hidden: true }]);
    await setCategoryHidden(d, space, 'baby', false);
    await renameCategory(d, space, 'baby', '', true);
    expect(await changes()).toEqual([]);
    const { records } = await d.store.readCollection(space, CATEGORIES);
    expect(records).toMatchObject([{ key: 'baby', deleted: true }]);
  });

  test('other cannot be hidden', async () => {
    const { d, space, changes } = await fresh();
    await setCategoryHidden(d, space, 'other', true);
    expect(await changes()).toEqual([]);
  });
});
