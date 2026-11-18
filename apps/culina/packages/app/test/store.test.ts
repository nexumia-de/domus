import { IDBObjectStore } from 'fake-indexeddb';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { checkStore, openStore, type Store } from '../src/store';
import { nextUpdatedAt } from '../src/store/clock';
import { mapError } from '../src/store/idb';
import { dumpRaw, freshFactory, clockOf, ONION, seedRaw, STOCK_OF_ONION } from './store-helpers';
import { must } from './must';

const T1 = '2026-11-18T08:00:00.000Z';

const open = async (factory = freshFactory(), now = clockOf(T1)): Promise<Store> => {
  const result = await openStore({ now, indexedDB: factory });
  if (!result.ok) throw new Error(`open failed: ${result.error.code}`);
  return result.store;
};

afterEach(() => vi.restoreAllMocks());

describe('create, reopen, read back', () => {
  test('a record survives closing and opening the database again', async () => {
    const factory = freshFactory();
    const first = await open(factory);
    expect((await first.put('ingredients', ONION)).ok).toBe(true);
    first.close();
    const second = await open(factory);
    const got = await second.get('ingredients', ONION.id);
    expect(got).toEqual({ ok: true, record: ONION });
    expect(await second.list('ingredients')).toEqual({ ok: true, records: [ONION] });
    expect(second.schemaVersion).toBe(1);
    expect(await dumpRaw(factory)).toMatchObject({ meta: [{ key: 'schemaVersion', value: 1 }] });
  });

  test('every kind has its own store and starts empty', async () => {
    const store = await open();
    for (const kind of [
      'ingredients',
      'templates',
      'components',
      'dishes',
      'stock',
      'affinities',
    ] as const) {
      expect(await store.list(kind)).toEqual({ ok: true, records: [] });
    }
  });

  test('get of an unknown id is not-found', async () => {
    const store = await open();
    expect(await store.get('stock', 'u-none')).toEqual({ ok: false, error: { code: 'not-found' } });
  });

  test('rows have the shape of materia sync records', async () => {
    const store = await open(freshFactory(), clockOf(T1, '2026-11-18T08:00:01.000Z'));
    await store.put('ingredients', ONION);
    await store.put('stock', STOCK_OF_ONION);
    await store.remove('stock', STOCK_OF_ONION.id);
    for (const kind of ['ingredients', 'stock'] as const) {
      const listed = await store.listRows(kind);
      for (const row of must(listed.ok ? listed.rows : null)) {
        expect(typeof row.key).toBe('string');
        expect(row.updatedAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/);
        expect(
          Object.keys(row).every((k) => ['key', 'updatedAt', 'deleted', 'value'].includes(k)),
        ).toBe(true);
        if (row.deleted) {
          expect(row.deleted).toBe(true);
          expect('value' in row).toBe(false);
        } else {
          expect(row.value?.id).toBe(row.key);
        }
      }
    }
  });
});

describe('validation before every write', () => {
  test('an invalid record is rejected with paths and nothing is stored', async () => {
    const store = await open();
    const bad = {
      id: 'u-aaaa',
      name: 'Onion',
      yields: [{ state: 'raw', percent: -5 }],
      secretNote: 'zzz-private',
    };
    const result = await store.put('ingredients', bad);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid-record');
    const paths = must(result.error.issues).map((i) => i.path);
    expect(paths).toContain('/yields/0/percent');
    expect(JSON.stringify(result)).not.toContain('zzz-private');
    expect(await store.list('ingredients')).toEqual({ ok: true, records: [] });
  });

  test('a record of the wrong kind or without id is rejected', async () => {
    const store = await open();
    expect((await store.put('stock', ONION)).ok).toBe(false);
    expect((await store.put('ingredients', { name: 'No id' })).ok).toBe(false);
    expect((await store.put('ingredients', null)).ok).toBe(false);
  });

  test('x- fields pass and are kept untouched', async () => {
    const store = await open();
    await store.put('ingredients', { ...ONION, 'x-mine': 1 });
    const got = await store.get('ingredients', ONION.id);
    expect(got.ok && got.record['x-mine']).toBe(1);
  });

  test('the generated validators use no eval', async () => {
    const { readFileSync } = await import('node:fs');
    const code = readFileSync(
      new URL('../src/store/validators.generated.js', import.meta.url),
      'utf8',
    );
    expect(code).not.toMatch(/new Function|\beval\(/);
  });
});

describe('remove writes a tombstone', () => {
  test('list hides it, listRows shows it, and put revives the record', async () => {
    const store = await open(
      freshFactory(),
      clockOf(T1, '2026-11-18T08:00:05.000Z', '2026-11-18T08:00:09.000Z'),
    );
    await store.put('ingredients', ONION);
    const removed = await store.remove('ingredients', ONION.id);
    expect(removed).toMatchObject({ ok: true, row: { key: ONION.id, deleted: true } });
    expect(await store.list('ingredients')).toEqual({ ok: true, records: [] });
    expect(await store.get('ingredients', ONION.id)).toEqual({
      ok: false,
      error: { code: 'not-found' },
    });
    expect(await store.listRows('ingredients')).toEqual({
      ok: true,
      rows: [{ key: ONION.id, updatedAt: '2026-11-18T08:00:05.000Z', deleted: true }],
    });
    expect((await store.remove('ingredients', ONION.id)).ok).toBe(false);
    const again = await store.put('ingredients', ONION);
    expect(again).toMatchObject({ ok: true, row: { updatedAt: '2026-11-18T08:00:09.000Z' } });
  });

  test('removing something that is not there is not-found', async () => {
    const store = await open();
    expect(await store.remove('dishes', 'u-none')).toEqual({
      ok: false,
      error: { code: 'not-found' },
    });
  });
});

describe('updatedAt is strictly increasing', () => {
  test('the rule: the later of now and the stored value plus 1 ms', () => {
    const clock = (value: string) => () => value;
    expect(nextUpdatedAt(clock(T1))).toBe(T1);
    expect(nextUpdatedAt(clock(T1), '2026-11-18T07:00:00.000Z')).toBe(T1);
    expect(nextUpdatedAt(clock(T1), T1)).toBe('2026-11-18T08:00:00.001Z');
    expect(nextUpdatedAt(clock('2026-11-17T00:00:00Z'), T1)).toBe('2026-11-18T08:00:00.001Z');
    expect(nextUpdatedAt(clock(T1), 'garbage')).toBe(T1);
    expect(() => nextUpdatedAt(clock('garbage'))).toThrow();
  });

  test('a clock that stands still or goes backwards still gives newer rows', async () => {
    const store = await open(freshFactory(), clockOf(T1, T1, '2026-11-17T00:00:00.000Z'));
    const stamps: string[] = [];
    for (let i = 0; i < 3; i++) {
      const put = await store.put('ingredients', { ...ONION, name: `Onion ${i}` });
      stamps.push(must(put.ok ? put.row.updatedAt : null));
    }
    expect(stamps).toEqual([T1, '2026-11-18T08:00:00.001Z', '2026-11-18T08:00:00.002Z']);
  });
});

describe('versions and availability', () => {
  test('a database written by a newer version is not opened', async () => {
    const factory = freshFactory();
    await seedRaw(factory, 7, {});
    const result = await openStore({ now: () => T1, indexedDB: factory });
    expect(result).toEqual({ ok: false, error: { code: 'newer-schema', found: 7, supported: 1 } });
    expect(await dumpRaw(factory)).toMatchObject({ meta: [{ key: 'schemaVersion', value: 7 }] });
  });

  test('without IndexedDB the store is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const result = await openStore({ now: () => T1 });
    vi.unstubAllGlobals();
    expect(result).toMatchObject({ ok: false, error: { code: 'unavailable' } });
  });

  test('a refused open (private mode) is unavailable', async () => {
    const refusing = {
      open: () => {
        throw new DOMException('denied', 'SecurityError');
      },
    } as unknown as IDBFactory;
    expect(await openStore({ now: () => T1, indexedDB: refusing })).toMatchObject({
      ok: false,
      error: { code: 'unavailable' },
    });
  });
});

describe('quota', () => {
  test('a QuotaExceededError while writing is quota-exceeded and stores nothing', async () => {
    const store = await open();
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(await store.put('ingredients', ONION)).toEqual({
      ok: false,
      error: { code: 'quota-exceeded' },
    });
    vi.restoreAllMocks();
    expect(await store.list('ingredients')).toEqual({ ok: true, records: [] });
  });

  test('errors map by name', () => {
    expect(mapError(new DOMException('x', 'QuotaExceededError'))).toEqual({
      code: 'quota-exceeded',
    });
    expect(mapError(new Error('boom')).code).toBe('unavailable');
  });
});

describe('checkStore', () => {
  test('reports unresolved references across stored records', async () => {
    const store = await open();
    await store.put('stock', STOCK_OF_ONION);
    const missing = await checkStore(store);
    expect(missing.ok && missing.findings.map((f) => f.code)).toEqual(['unknown-ingredient']);
    await store.put('ingredients', { id: ONION.id, name: 'Onion' });
    expect(await checkStore(store)).toEqual({ ok: true, findings: [] });
  });
});
