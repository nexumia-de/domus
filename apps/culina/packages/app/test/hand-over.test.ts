// Handing what a dish lacks to the shopping list (src/shared-list/hand-over.ts): written into the
// collection `list` of the space Culina uses, through the shared list package's `planAdds`, and
// read back with the shared `entriesOf`, as Emptio reads it (Culina may not import Emptio).
// What this does not prove: the shared database is the memory store or fake-indexeddb, never a
// browser's IndexedDB with two real tabs; the storage is a memory stand-in with etags; the clock
// is injected; Emptio's screens are not run (its `addToList` is the same `planAdd` called here).
import {
  createIdbStore,
  createMemoryStore,
  deriveSpace,
  localChange,
  newSecret,
  syncCollection,
  type Store,
} from '@nexumia-de/hospes';
import { LIST, entriesOf, planAdd, type AddInput, type Entry } from '@nexumia-de/list';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, test } from 'vitest';
import { freeLines } from '@culina/engine';
import { finalOutcome, handOver, handOverEdit, undoHandOver } from '../src/shared-list/hand-over';
import { SPACE_KEY } from '../src/prefs';
import { createStockSpace, type StockSpace } from '../src/shared-stock/space';
import { memoryPrefs, memoryStorage, noTimers } from './stock-helpers';

const clock = (start = '2026-11-24T08:00:00Z') => {
  let t = Date.parse(start);
  return () => new Date((t += 1000)).toISOString();
};
const ids = (prefix = 'h') => {
  let n = 0;
  return () => `${prefix}${++n}`;
};
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 30));

const line = (
  name: string,
  ingredientId: string | undefined,
  amount: string,
  dish: { title: string; dish?: string } = { title: 'Shortbread', dish: 'shipped:shortbread' },
): AddInput => ({
  name,
  ...(ingredientId === undefined ? {} : { ingredientId }),
  amount,
  priority: 'soon',
  origins: [{ kind: 'recipe', app: 'culina', ...dish }],
  ...(ingredientId === undefined
    ? {}
    : { catalogue: { ingredientId, categoryId: name === 'Butter' ? 'dairy' : 'baking' } }),
});
const SHORTBREAD = [line('Butter', 'fdc-173410', '200 g'), line('Flour', 'fdc-169761', '300 g')];

const spaceOn = async (
  shared: Store,
  now = clock(),
  adapter = memoryStorage().adapter,
  prefs = memoryPrefs(),
) => {
  const space = createStockSpace({
    shared,
    now,
    prefs,
    names: { home: 'Home', unnamed: 'Unnamed' },
    shownCount: (records) => records.length,
    onRecords: () => undefined,
    adapter: () => adapter,
    ...noTimers,
  });
  await space.load();
  return space;
};

const listOf = async (shared: Store, space: StockSpace): Promise<Entry[]> =>
  entriesOf((await shared.readCollection(space.state().space?.id ?? '', LIST)).records);

/** A person's change in Emptio: an atomic change of the same collection. */
const inEmptio = (
  shared: Store,
  spaceId: string,
  change: (entry: Record<string, unknown>) => Record<string, unknown>,
  key: string,
  now = clock('2026-11-24T09:00:00Z'),
) =>
  localChange(shared, spaceId, LIST, now, (records) => {
    const value = records.find((r) => r.key === key)?.value as Record<string, unknown>;
    return { put: [{ key, value: change({ ...value }) }] };
  });

describe('handOver', () => {
  test('puts every line on the list of the used space, as entries Emptio reads, with a recipe origin', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const done = await handOver(space, SHORTBREAD, { now: clock(), newId: ids() });
    expect(done.ok && done.outcome.lines).toEqual([
      { name: 'Butter', outcome: 'added', id: 'h1' },
      { name: 'Flour', outcome: 'added', id: 'h2' },
    ]);
    const list = await listOf(shared, space);
    expect(list.map((e) => [e.name, e.amount, e.categoryId, e.priority])).toEqual([
      ['Butter', '200 g', 'dairy', 'soon'],
      ['Flour', '300 g', 'baking', 'soon'],
    ]);
    expect(list[0]?.origins).toEqual([
      { kind: 'recipe', app: 'culina', title: 'Shortbread', dish: 'shipped:shortbread' },
    ]);
    expect(done.ok && done.outcome.space).toEqual({ id: space.state().space?.id, name: 'Home' });
  });

  test('joins an open entry of the same ingredient and says so; the household’s category wins (rule 4)', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const spaceId = space.state().space?.id ?? '';
    await localChange(shared, spaceId, LIST, clock(), (records) => {
      const plan = planAdd(
        records,
        { name: 'Butter', ingredientId: 'fdc-173410', categoryId: 'fridge', amount: '1 pack' },
        { now: clock(), newId: () => 'typed' },
      );
      return plan === null ? {} : { put: [plan.put] };
    });
    const done = await handOver(space, SHORTBREAD, { now: clock(), newId: ids() });
    expect(done.ok && done.outcome.lines.map((l) => l.outcome)).toEqual(['joined', 'added']);
    const butter = (await listOf(shared, space)).find((e) => e.id === 'typed');
    expect(butter).toMatchObject({ amount: '1 pack + 200 g', categoryId: 'fridge' });
    expect(butter?.origins).toEqual([
      { kind: 'typed' },
      { kind: 'recipe', app: 'culina', title: 'Shortbread', dish: 'shipped:shortbread' },
    ]);
  });

  test('handing the same dish twice doubles nothing, also where it joined a typed amount', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const spaceId = space.state().space?.id ?? '';
    await localChange(shared, spaceId, LIST, clock(), (records) => {
      const plan = planAdd(
        records,
        { name: 'Flour', ingredientId: 'fdc-169761', amount: '1 kg' },
        { now: clock(), newId: () => 'typed' },
      );
      return plan === null ? {} : { put: [plan.put] };
    });
    await handOver(space, SHORTBREAD, { now: clock(), newId: ids() });
    const before = await shared.readCollection(spaceId, LIST);
    const again = await handOver(space, SHORTBREAD, { now: clock(), newId: ids('x') });
    expect(again.ok && again.outcome.lines.map((l) => l.outcome)).toEqual(['already', 'already']);
    expect(again.ok && again.outcome.undo.writes).toEqual([]);
    expect(await shared.readCollection(spaceId, LIST)).toEqual(before);
    expect((await listOf(shared, space)).map((e) => e.amount)).toEqual(['1 kg + 300 g', '200 g']);
  });

  test('a bought entry does not count: the dish handed again after shopping makes a new entry, the open one stays already there', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const spaceId = space.state().space?.id ?? '';
    await handOver(space, SHORTBREAD, { now: clock(), newId: ids() });
    await inEmptio(
      shared,
      spaceId,
      (v) => ({ ...v, bought: { at: '2026-11-24T10:00:00Z' } }),
      'h1',
    );
    const again = await handOver(space, SHORTBREAD, { now: clock(), newId: ids('x') });
    expect(again.ok && again.outcome.lines).toEqual([
      { name: 'Butter', outcome: 'added', id: 'x1' },
      { name: 'Flour', outcome: 'already', id: 'h2', listed: '300 g', asked: '300 g' },
    ]);
  });

  test('open weakness of rule 5, pinned as it is: an equal amount is dropped on join', async () => {
    // The household typed "200 g" of the same butter; the dish needs another 200 g. The list
    // shows one "200 g" with both origins, so the household buys 200 g too little.
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const spaceId = space.state().space?.id ?? '';
    await localChange(shared, spaceId, LIST, clock(), (records) => {
      const plan = planAdd(
        records,
        { name: 'Butter', ingredientId: 'fdc-173410', amount: '200 g' },
        { now: clock(), newId: () => 'typed' },
      );
      return plan === null ? {} : { put: [plan.put] };
    });
    await handOver(space, SHORTBREAD.slice(0, 1), { now: clock(), newId: ids() });
    const list = await listOf(shared, space);
    expect(list).toHaveLength(1);
    expect(list[0]?.amount).toBe('200 g');
  });

  test('open weakness of rule 5, pinned as it is: a typed name without an id never joins the catalogue’s', async () => {
    // "Butter" typed in Emptio has no ingredient id; Culina's butter has one. The list shows
    // "Butter" twice.
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const spaceId = space.state().space?.id ?? '';
    await localChange(shared, spaceId, LIST, clock(), (records) => {
      const plan = planAdd(records, { name: 'Butter' }, { now: clock(), newId: () => 'typed' });
      return plan === null ? {} : { put: [plan.put] };
    });
    const done = await handOver(space, SHORTBREAD.slice(0, 1), { now: clock(), newId: ids() });
    expect(done.ok && done.outcome.lines[0]?.outcome).toBe('added');
    expect((await listOf(shared, space)).map((e) => e.name)).toEqual(['Butter', 'Butter']);
  });

  test('an already line says what the list holds and what was asked, so a screen can tell other portions', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    await handOver(space, SHORTBREAD, { now: clock(), newId: ids() });
    const double = [line('Butter', 'fdc-173410', '400 g'), line('Flour', 'fdc-169761', '600 g')];
    const again = await handOver(space, double, { now: clock(), newId: ids('x') });
    expect(again.ok && again.outcome.lines).toEqual([
      { name: 'Butter', outcome: 'already', id: 'h1', listed: '200 g', asked: '400 g' },
      { name: 'Flour', outcome: 'already', id: 'h2', listed: '300 g', asked: '600 g' },
    ]);
    expect((await listOf(shared, space)).map((e) => e.amount)).toEqual(['200 g', '300 g']);
  });

  test('the dish is known by its key: handed in English and then in German it is already there', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    await handOver(space, SHORTBREAD, { now: clock(), newId: ids() });
    const german = [
      line('Butter', 'fdc-173410', '200 g', { title: 'Mürbeteig', dish: 'shipped:shortbread' }),
    ];
    const again = await handOver(space, german, { now: clock(), newId: ids('x') });
    expect(again.ok && again.outcome.lines.map((l) => l.outcome)).toEqual(['already']);
  });

  test('two dishes of one title are two dishes: the second one’s lines are not skipped', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    await handOver(space, SHORTBREAD, { now: clock(), newId: ids() });
    const other = [
      line('Butter', 'fdc-173410', '100 g', { title: 'Shortbread', dish: 'own:my-shortbread' }),
    ];
    const again = await handOver(space, other, { now: clock(), newId: ids('x') });
    expect(again.ok && again.outcome.lines.map((l) => l.outcome)).toEqual(['joined']);
    const butter = (await listOf(shared, space))[0];
    expect(butter?.amount).toBe('200 g + 100 g');
    expect(butter?.origins.map((o) => (o.kind === 'recipe' ? o.dish : o.kind))).toEqual([
      'shipped:shortbread',
      'own:my-shortbread',
    ]);
  });

  test('an origin without a dish key (written before 2026-11-24) is matched by its title', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const old = [line('Butter', 'fdc-173410', '200 g', { title: 'Shortbread' })];
    await handOver(space, old, { now: clock(), newId: ids() });
    const again = await handOver(space, SHORTBREAD.slice(0, 1), { now: clock(), newId: ids('x') });
    expect(again.ok && again.outcome.lines.map((l) => l.outcome)).toEqual(['already']);
  });

  test('a line with an empty name is said to be empty and writes nothing; the others are written', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const done = await handOver(space, [line('  ', undefined, '1'), ...SHORTBREAD], {
      now: clock(),
      newId: ids(),
    });
    expect(done.ok && done.outcome.lines.map((l) => [l.outcome, l.id])).toEqual([
      ['empty', undefined],
      ['added', 'h1'],
      ['added', 'h2'],
    ]);
    expect(await listOf(shared, space)).toHaveLength(2);
  });

  test('free names the cook ticked go on the list as names without an id', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const free = freeLines(['Kidney suet'], { title: 'Frikandelle', dish: 'shipped:frikandelle' });
    const done = await handOver(space, free, { now: clock(), newId: ids() });
    expect(done.ok && done.outcome.lines[0]?.outcome).toBe('added');
    const [suet] = await listOf(shared, space);
    expect(suet).toMatchObject({ name: 'Kidney suet', categoryId: 'other', priority: 'soon' });
    expect(suet?.ingredientId).toBeUndefined();
  });

  test('with two spaces the list written is the one Culina uses, which Emptio may not show; the result names it', async () => {
    const shared = createMemoryStore();
    const home = await spaceOn(shared);
    const homeId = home.state().space?.id ?? '';
    home.stop();
    const secret = newSecret();
    const flat = await deriveSpace(secret);
    await shared.putSpace({
      id: flat.id,
      secret,
      name: 'Flat',
      storage: { type: 'device', address: '' },
    });
    // Culina's own choice of space (`culina.space`); Emptio keeps `emptio.space` and may show Home.
    const culina = await spaceOn(shared, clock(), undefined, memoryPrefs({ [SPACE_KEY]: flat.id }));
    const done = await handOver(culina, SHORTBREAD, { now: clock(), newId: ids() });
    expect(done.ok && done.outcome.space).toEqual({ id: flat.id, name: 'Flat' });
    expect(entriesOf((await shared.readCollection(homeId, LIST)).records)).toEqual([]);
    expect(entriesOf((await shared.readCollection(flat.id, LIST)).records)).toHaveLength(2);
    culina.stop();
  });

  test('a store that fails while writing leaves nothing written, and the caller is told', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const spaceId = space.state().space?.id ?? '';
    const failing: Store = {
      ...shared,
      // The decision runs (every line is planned), then the write fails before it is stored.
      changeRecords: async (id, name, fn) => {
        fn(await shared.readCollection(id, name));
        throw new Error('quota');
      },
    };
    const broken = await spaceOn(failing);
    const done = await handOver(broken, SHORTBREAD, { now: clock(), newId: ids() });
    expect(done).toEqual({ ok: false, why: 'unavailable' });
    expect((await shared.readCollection(spaceId, LIST)).records).toEqual([]);
    space.stop();
    broken.stop();
  });
});

describe('undoHandOver', () => {
  test('removes what it added and gives a joined entry its value before', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const spaceId = space.state().space?.id ?? '';
    await localChange(shared, spaceId, LIST, clock(), (records) => {
      const plan = planAdd(
        records,
        { name: 'Butter', ingredientId: 'fdc-173410', amount: '1 pack' },
        { now: clock(), newId: () => 'typed' },
      );
      return plan === null ? {} : { put: [plan.put] };
    });
    const typed = (await listOf(shared, space))[0];
    const done = await handOver(space, SHORTBREAD, { now: clock(), newId: ids() });
    if (!done.ok) throw new Error('hand-over failed');
    const undone = await undoHandOver(space, done.outcome.undo);
    expect(undone.ok && undone.outcome).toEqual({
      undone: ['typed', 'h2'],
      kept: [],
      restored: ['typed'],
      gone: [],
      bought: [],
    });
    expect(await listOf(shared, space)).toEqual([typed]);
    // The added entry is a removal marker, so the removal reaches the other devices.
    const records = (await shared.readCollection(spaceId, LIST)).records;
    expect(records.find((r) => r.key === 'h2')?.deleted).toBe(true);
  });

  test('two hand-overs of one page undone, the last first: an entry the second joined and the first made is removed, and said so', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const first = await handOver(space, SHORTBREAD, { now: clock(), newId: ids() });
    // The same dish with another filling is another dish: its butter joins the entry made above.
    const other = { title: 'Shortbread', dish: 'shipped:shortbread#0=x' };
    const second = await handOver(space, [line('Butter', 'fdc-173410', '50 g', other)], {
      now: clock(),
      newId: ids(),
    });
    if (!first.ok || !second.ok) throw new Error('hand-over failed');
    expect(second.outcome.lines.map((l) => l.outcome)).toEqual(['joined']);
    const undoneSecond = await undoHandOver(space, second.outcome.undo);
    const undoneFirst = await undoHandOver(space, first.outcome.undo);
    if (!undoneSecond.ok || !undoneFirst.ok) throw new Error('undo failed');
    // Each Undo alone: the second put the butter back as before, the first removed it.
    expect(undoneSecond.outcome.restored).toEqual(['h1']);
    expect(undoneFirst.outcome.undone).toContain('h1');
    expect(finalOutcome([undoneSecond.outcome, undoneFirst.outcome])).toEqual({
      undone: ['h1', 'h2'],
      kept: [],
      restored: [],
      gone: [],
      bought: [],
    });
    expect(await listOf(shared, space)).toEqual([]);
  });

  test('finalOutcome keeps per entry the state of the oldest Undo, ticked and removed apart from edited', () => {
    const none = { undone: [], kept: [], restored: [], gone: [], bought: [] };
    const newer = {
      ...none,
      undone: ['a', 'b'],
      restored: ['a'],
      kept: ['c', 'd', 'e'],
      gone: ['d'],
      bought: ['e'],
    };
    const older = { ...none, kept: ['b'], bought: ['b'] };
    expect(finalOutcome([newer, older])).toEqual({
      undone: ['a'],
      kept: ['b', 'c', 'd', 'e'],
      restored: ['a'],
      gone: ['d'],
      bought: ['b', 'e'],
    });
  });

  test('an entry removed in Emptio in between is left and said to be gone, not left on the list', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const spaceId = space.state().space?.id ?? '';
    const done = await handOver(space, SHORTBREAD, { now: clock(), newId: ids() });
    if (!done.ok) throw new Error('hand-over failed');
    await localChange(shared, spaceId, LIST, clock(), () => ({ remove: ['h1'] }));
    const undone = await undoHandOver(space, done.outcome.undo);
    expect(undone.ok && undone.outcome).toEqual({
      undone: ['h2'],
      kept: ['h1'],
      restored: [],
      gone: ['h1'],
      bought: [],
    });
    expect(await listOf(shared, space)).toEqual([]);
  });

  test('leaves an entry ticked or edited in Emptio in between, and undoes the others', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const spaceId = space.state().space?.id ?? '';
    const done = await handOver(space, [...SHORTBREAD, line('Sugar', 'fdc-169655', '100 g')], {
      now: clock(),
      newId: ids(),
    });
    if (!done.ok) throw new Error('hand-over failed');
    await inEmptio(
      shared,
      spaceId,
      (v) => ({ ...v, bought: { at: '2026-11-24T10:00:00Z' } }),
      'h1',
    );
    await inEmptio(shared, spaceId, (v) => ({ ...v, amount: '500 g' }), 'h2');
    const undone = await undoHandOver(space, done.outcome.undo);
    expect(undone.ok && undone.outcome).toEqual({
      undone: ['h3'],
      kept: ['h1', 'h2'],
      restored: [],
      gone: [],
      bought: ['h1'],
    });
    const list = await listOf(shared, space);
    expect(list.map((e) => [e.id, e.amount, e.bought !== undefined])).toEqual([
      ['h1', '200 g', true],
      ['h2', '500 g', false],
    ]);
  });

  test('goes to the space of the hand-over, even when another space is used by then', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const first = space.state().space?.id ?? '';
    const done = await handOver(space, SHORTBREAD, { now: clock(), newId: ids() });
    if (!done.ok) throw new Error('hand-over failed');
    const secret = newSecret();
    const other = await deriveSpace(secret);
    await shared.putSpace({
      id: other.id,
      secret,
      name: 'Flat',
      storage: { type: 'device', address: '' },
    });
    await space.load();
    await space.choose(other.id);
    expect(space.state().space?.id).toBe(other.id);
    const undone = await undoHandOver(space, done.outcome.undo);
    expect(undone.ok && undone.spaceId).toBe(first);
    expect(entriesOf((await shared.readCollection(first, LIST)).records)).toEqual([]);
    space.stop();
  });
});

describe('orderings', () => {
  test('Emptio adds in another tab at the same moment: both are kept, the same thing is one entry', async () => {
    const shared = createMemoryStore();
    const space = await spaceOn(shared);
    const spaceId = space.state().space?.id ?? '';
    const emptio = localChange(shared, spaceId, LIST, clock(), (records) => {
      const plan = planAdd(
        records,
        { name: 'Butter', ingredientId: 'fdc-173410', amount: '1 pack' },
        { now: clock(), newId: () => 'typed' },
      );
      return plan === null ? {} : { put: [plan.put] };
    });
    const culina = handOver(space, SHORTBREAD, { now: clock(), newId: ids() });
    await Promise.all([emptio, culina]);
    const list = await listOf(shared, space);
    expect(list.map((e) => [e.name, e.amount])).toEqual([
      ['Butter', '1 pack + 200 g'],
      ['Flour', '300 g'],
    ]);
  });

  test('two Culina tabs hand the same dish at once (fake-indexeddb): one entry per line, nothing doubled', async () => {
    const factory = new IDBFactory();
    const tabA = createIdbStore({ factory });
    const a = await spaceOn(tabA);
    const tabB = createIdbStore({ factory });
    const b = await spaceOn(tabB);
    expect(b.state().space?.id).toBe(a.state().space?.id);
    const [one, two] = await Promise.all([
      handOver(a, SHORTBREAD, { now: clock(), newId: ids('a') }),
      handOver(b, SHORTBREAD, { now: clock(), newId: ids('b') }),
    ]);
    const outcomes = [one, two].map((r) => (r.ok ? r.outcome.lines.map((l) => l.outcome) : []));
    expect(outcomes).toContainEqual(['added', 'added']);
    expect(outcomes).toContainEqual(['already', 'already']);
    const list = await listOf(tabA, a);
    expect(list.map((e) => [e.name, e.amount])).toEqual([
      ['Butter', '200 g'],
      ['Flour', '300 g'],
    ]);
    a.stop();
    b.stop();
    tabA.close();
    tabB.close();
  });

  test('a hand-over during a sync cycle is kept and sent with the next cycle', async () => {
    const secret = newSecret();
    const space = await deriveSpace(secret);
    const storage = memoryStorage();
    const shared = createMemoryStore();
    await shared.putSpace({
      id: space.id,
      secret,
      name: 'Flat',
      storage: { type: 'test', address: 'x' },
    });
    const now = clock();
    const culina = await spaceOn(shared, now, storage.adapter);
    expect(culina.state().space?.id).toBe(space.id);
    // The storage answers the read only after the hand-over was written.
    const slow = {
      ...storage.adapter,
      read: async (path: string) => {
        await handOver(culina, SHORTBREAD, { now, newId: ids() });
        return storage.adapter.read(path);
      },
    };
    const first = await syncCollection({
      space,
      collection: LIST,
      adapter: slow,
      store: shared,
      now,
    });
    expect(first.ok && first.pending).toBe(true);
    expect(await listOf(shared, culina)).toHaveLength(2);
    await syncCollection({ space, collection: LIST, adapter: storage.adapter, store: shared, now });
    // A second device reads the file and finds both lines.
    const other = createMemoryStore();
    await other.putSpace({
      id: space.id,
      secret,
      name: 'Flat',
      storage: { type: 'test', address: 'x' },
    });
    await syncCollection({ space, collection: LIST, adapter: storage.adapter, store: other, now });
    expect(
      entriesOf((await other.readCollection(space.id, LIST)).records).map((e) => e.name),
    ).toEqual(['Butter', 'Flour']);
    culina.stop();
  });

  test('the loops keep the list in step: the entries leave the device without Emptio open', async () => {
    const secret = newSecret();
    const space = await deriveSpace(secret);
    const storage = memoryStorage();
    const shared = createMemoryStore();
    await shared.putSpace({
      id: space.id,
      secret,
      name: 'Flat',
      storage: { type: 'test', address: 'x' },
    });
    const culina = await spaceOn(shared, clock(), storage.adapter);
    await handOver(culina, SHORTBREAD, { now: clock(), newId: ids() });
    culina.online();
    await settle();
    expect([...storage.files.keys()].sort()).toEqual([
      `${space.id}/list.json`,
      `${space.id}/stock.json`,
    ]);
    culina.stop();
  });

  test('Undo while another device’s tick has not arrived: Undo wins with the newer stamp, the tick is lost', async () => {
    const secret = newSecret();
    const space = await deriveSpace(secret);
    const storage = memoryStorage();
    const stored = { id: space.id, secret, name: 'Flat', storage: { type: 'test', address: 'x' } };
    const a = createMemoryStore();
    const b = createMemoryStore();
    await a.putSpace(stored);
    await b.putSpace(stored);
    // B's tick is earlier in time than A's Undo (the clocks are right): the later stamp wins whole.
    const nowA = clock('2026-11-24T08:00:00Z');
    const nowB = clock('2026-11-24T07:59:00Z');
    const cycle = (store: Store, now: () => string) =>
      syncCollection({ space, collection: LIST, adapter: storage.adapter, store, now });
    const culina = await spaceOn(a, nowA, storage.adapter);
    const done = await handOver(culina, SHORTBREAD.slice(0, 1), { now: nowA, newId: ids() });
    if (!done.ok) throw new Error('hand-over failed');
    await cycle(a, nowA);
    await cycle(b, nowB);
    // Device B ticks the butter in Emptio; before B syncs, the cook on A presses Undo.
    await inEmptio(
      b,
      space.id,
      (v) => ({ ...v, bought: { at: '2026-11-24T07:59:31Z' } }),
      'h1',
      // B's clock is behind A's: its tick is stamped just after the hand-over it read.
      clock('2026-11-24T07:59:30Z'),
    );
    const undone = await undoHandOver(culina, done.outcome.undo);
    expect(undone.ok && undone.outcome.undone).toEqual(['h1']);
    await cycle(a, nowA);
    await cycle(b, nowB);
    await cycle(a, nowA);
    expect(entriesOf((await b.readCollection(space.id, LIST)).records)).toEqual([]);
    culina.stop();
  });

  test('after the update, a device whose stock was synced still says when, while its list never was', async () => {
    const secret = newSecret();
    const space = await deriveSpace(secret);
    const shared = createMemoryStore();
    await shared.putSpace({
      id: space.id,
      secret,
      name: 'Flat',
      storage: { type: 'test', address: 'x' },
    });
    await shared.writeCollection(space.id, 'stock', {
      records: [{ key: 'carrot', updatedAt: '2026-11-20T08:00:00.000Z', value: { present: true } }],
      syncedAt: '2026-11-20T08:00:00.000Z',
    });
    // No cycle runs here: the device is offline.
    const culina = createStockSpace({
      shared,
      now: clock(),
      prefs: memoryPrefs(),
      names: { home: 'Home', unnamed: 'Unnamed' },
      shownCount: (records) => records.length,
      onRecords: () => undefined,
      adapter: () => memoryStorage().adapter,
      isOnline: () => false,
      ...noTimers,
    });
    await culina.load();
    expect(culina.status()).toEqual({ kind: 'in-step', at: '2026-11-20T08:00:00.000Z' });
    expect(culina.listStatus()).toEqual({ kind: 'never' });
    culina.stop();
  });

  test('a list file that cannot be read is the list’s failure: the stock says it is in step', async () => {
    const secret = newSecret();
    const space = await deriveSpace(secret);
    const storage = memoryStorage();
    storage.files.set(`${space.id}/list.json`, { body: 'not a sealed file', etag: 'x' });
    const shared = createMemoryStore();
    await shared.putSpace({
      id: space.id,
      secret,
      name: 'Flat',
      storage: { type: 'test', address: 'x' },
    });
    const culina = await spaceOn(shared, clock(), storage.adapter);
    await culina.change((records) => ({
      edit: { put: [{ key: 'carrot', value: { present: true } }] },
      outcome: records.length,
    }));
    culina.online();
    await settle();
    expect(culina.status()).toMatchObject({ kind: 'in-step' });
    expect(culina.listStatus()).toEqual({ kind: 'failed', failure: 'not-sealed' });
    expect(storage.files.has(`${space.id}/stock.json`)).toBe(true);
    expect(storage.files.get(`${space.id}/list.json`)?.body).toBe('not a sealed file');
    culina.stop();
  });
});

describe('handOverEdit', () => {
  test('two lines of one thing in one hand-over: the second counts as added with the first', () => {
    const { outcome } = handOverEdit(
      [],
      [line('Butter', 'fdc-173410', '200 g'), line('Butter', 'fdc-173410', '2 tbsp')],
      { now: clock(), newId: ids() },
    ) as { outcome: { lines: { outcome: string }[] } };
    expect(outcome.lines.map((l) => l.outcome)).toEqual(['added', 'added']);
  });
});
