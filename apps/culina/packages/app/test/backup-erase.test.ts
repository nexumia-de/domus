// "Erase everything on this device": the counts the question names, the erase of Culina's own
// database and preferences, the stock of the space left alone, and a start afterwards that is a
// first start. What it does not prove: fake-indexeddb and a memory store for the shared database,
// not a browser; prefs in memory, not localStorage; one tab (a second open tab keeps its cache).
import { describe, expect, test } from 'vitest';
import { eraseCounts, eraseEverything, type ErasablePrefs } from '../src/exchange/erase';
import { keepDraft, learnedSkills, setLearned, stockSpaces, tick } from '../src/notebook';
import { state } from '../src/notebook/state';
import { liveStock, startWithStock } from './stock-helpers';
import { must } from './must';

const CARROT = { kind: 'ingredient', id: 'carrot' } as const;

/** localStorage in memory, with the listing and removal the erase uses. */
const prefsOf = (initial: Record<string, string>): ErasablePrefs & { all(): string[] } => {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    removeItem: (key) => void values.delete(key),
    all: () => [...values.keys()].sort(),
  };
};

const PREFS = {
  'culina.theme': 'dark',
  'culina.lang': 'de',
  'culina.dishes': '{"origin":"own"}',
  'culina.lastExport': '2026-11-20T08:00:00.000Z',
  'culina.space': 'space-1',
  'mixtura.theme': 'light',
  'domus.device': 'd-1',
};

describe('erase everything on this device', () => {
  test('the counts name every kind, the drafts and the preferences of this app only', async () => {
    await startWithStock();
    await setLearned('pan-fry', true);
    await keepDraft('component:new', { name: 'half written' });
    const counts = await eraseCounts(prefsOf(PREFS));
    if (!counts.ok) throw new Error(counts.error.code);
    expect(counts.counts.records.skills).toBe(1);
    expect(counts.counts.records.ingredients).toBe(state.ingredients.length);
    expect(counts.counts.records.components).toBe(state.components.length);
    expect(counts.counts.drafts).toBe(1);
    expect(counts.counts.prefs).toBe(5);
  });

  test('it empties the notebook, the skills, drafts and old stock items, and this app’s preferences; the stock of the space stays', async () => {
    const { shared, factory } = await startWithStock();
    await setLearned('pan-fry', true);
    await keepDraft('dish:new', { name: 'half written' });
    must(await tick(CARROT).then((r) => (r.ok ? r : undefined)));
    // An old item that has not moved into a space yet is Culina's own data too.
    must(
      await state.store
        ?.put('stock', { id: 'u-old', ref: { kind: 'ingredient', id: 'carrot' } })
        .then((r) => (r.ok ? r : undefined)),
    );
    const spaceId = must(stockSpaces().used).id;
    const stockBefore = await liveStock(shared, spaceId);
    expect(stockBefore).toEqual({ carrot: { present: true } });
    const prefs = prefsOf(PREFS);

    expect((await eraseEverything(prefs)).ok).toBe(true);

    expect(prefs.all()).toEqual(['domus.device', 'mixtura.theme']);
    const store = must(state.store);
    for (const kind of [
      'ingredients',
      'components',
      'dishes',
      'tastings',
      'skills',
      'stock',
    ] as const) {
      const rows = await store.listRows(kind);
      expect(rows.ok && rows.rows, kind).toEqual([]);
    }
    const drafts = await store.drafts.list();
    expect(drafts.ok && drafts.drafts).toEqual([]);
    expect(await liveStock(shared, spaceId)).toEqual(stockBefore);
    expect((await shared.listSpaces()).map((s) => s.id)).toEqual([spaceId]);

    // The next start reads an empty notebook, as on a first start.
    await startWithStock({ shared, factory, examples: false });
    expect(state.ingredients).toEqual([]);
    expect(state.components).toEqual([]);
    expect(learnedSkills().size).toBe(0);
    expect(must(state.store).schemaVersion).toBeGreaterThan(0);
  });

  test('without a store nothing is erased and the reason is given', async () => {
    await startWithStock();
    state.store = undefined;
    const prefs = prefsOf(PREFS);
    const done = await eraseEverything(prefs);
    expect(done.ok === false && done.error.code).toBe('unavailable');
    expect(prefs.all()).toHaveLength(7);
  });
});
