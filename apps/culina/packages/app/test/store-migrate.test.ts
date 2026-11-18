import { describe, expect, test } from 'vitest';
import { MIGRATIONS } from '../src/store/migrations';
import { openStore, type Migration, type Rows } from '../src/store';
import { dumpRaw, fixture, freshFactory, seedRaw } from './store-helpers';

const NOW = () => '2026-11-18T08:00:00.000Z';

/** TEST-ONLY migration 1 -> 2: renames the field `x-oldNote` to `x-note` in every record. */
const rename: Migration = {
  from: 1,
  to: 2,
  migrate: (rows) => {
    const next = structuredClone(rows);
    for (const list of Object.values(next)) {
      for (const row of list) {
        const value = row.value as Record<string, unknown> | undefined;
        if (value && 'x-oldNote' in value) value['x-note'] = value['x-oldNote'];
        if (value) delete value['x-oldNote'];
      }
    }
    return next;
  },
};

const explode: Migration = {
  from: 1,
  to: 2,
  migrate: () => {
    throw new Error('cannot convert');
  },
};

const seeded = async () => {
  const before = fixture('v1-before.json');
  const factory = freshFactory();
  await seedRaw(factory, before.schemaVersion, before.rows);
  return { before, factory };
};

describe('the shipped migrations', () => {
  test('there are none yet and the schema is version 1', () => {
    expect(MIGRATIONS).toEqual([]);
  });
});

describe('migration 1 to 2 (test-only) with fixtures', () => {
  test('the before fixture becomes the after fixture, in one go', async () => {
    const { factory } = await seeded();
    const result = await openStore({ now: NOW, indexedDB: factory, migrations: [rename] });
    expect(result.ok).toBe(true);
    const after = fixture('v1-after.json');
    const raw = await dumpRaw(factory);
    expect(raw.ingredients).toEqual(after.rows.ingredients);
    expect(raw.stock).toEqual(after.rows.stock);
    expect(raw.meta).toEqual([{ key: 'schemaVersion', value: after.schemaVersion }]);
    expect(raw.backup).toEqual([]);
    if (result.ok) expect(result.store.schemaVersion).toBe(2);
  });

  test('the tombstone and updatedAt survive the migration', async () => {
    const { factory } = await seeded();
    const result = await openStore({ now: NOW, indexedDB: factory, migrations: [rename] });
    if (!result.ok) throw new Error('open failed');
    const rows = await result.store.listRows('ingredients');
    expect(rows.ok && rows.rows.map((r) => [r.updatedAt, r.deleted === true])).toEqual([
      ['2026-11-16T09:00:00.000Z', false],
      ['2026-11-17T10:00:00.000Z', true],
    ]);
  });

  test('a database already at the new version is not migrated again', async () => {
    const { factory } = await seeded();
    await openStore({ now: NOW, indexedDB: factory, migrations: [rename] });
    const again = await openStore({ now: NOW, indexedDB: factory, migrations: [rename] });
    expect(again.ok).toBe(true);
    expect((await dumpRaw(factory)).stock).toEqual(fixture('v1-after.json').rows.stock);
  });
});

describe('a failed migration keeps the data', () => {
  const expectUntouched = async (factory: IDBFactory, before: Partial<Rows>) => {
    const raw = await dumpRaw(factory);
    expect(raw.ingredients).toEqual(before.ingredients);
    expect(raw.stock).toEqual(before.stock);
    expect(raw.meta).toEqual([{ key: 'schemaVersion', value: 1 }]);
    expect(raw.backup).toEqual([]);
  };

  test('a migration that throws: old rows and version stay, backup is empty', async () => {
    const { before, factory } = await seeded();
    const result = await openStore({ now: NOW, indexedDB: factory, migrations: [explode] });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'migration-failed', step: '1->2', reason: 'Error: cannot convert' },
    });
    await expectUntouched(factory, before.rows);
    if (result.ok || !result.readOnly) throw new Error('no read-only handle');
    const old = await result.readOnly.list('ingredients');
    expect(old.ok && old.records.map((r) => r.name)).toEqual(['Onion']);
  });

  test('a result that breaks a schema is refused before anything is written', async () => {
    const { before, factory } = await seeded();
    const breaking: Migration = {
      from: 1,
      to: 2,
      migrate: (rows) => {
        const next = structuredClone(rows);
        next.stock = next.stock.map((row) => ({
          ...row,
          value: { id: row.key },
        })) as Rows['stock'];
        return next;
      },
    };
    const result = await openStore({ now: NOW, indexedDB: factory, migrations: [breaking] });
    expect(result).toMatchObject({ ok: false, error: { code: 'migration-failed' } });
    await expectUntouched(factory, before.rows);
  });

  test('a failure in a later step undoes the earlier one too', async () => {
    const { before, factory } = await seeded();
    const second: Migration = { from: 2, to: 3, migrate: explode.migrate };
    const result = await openStore({ now: NOW, indexedDB: factory, migrations: [rename, second] });
    expect(result).toMatchObject({ ok: false, error: { code: 'migration-failed', step: '2->3' } });
    await expectUntouched(factory, before.rows);
  });

  test('the old data can be migrated by a corrected migration afterwards', async () => {
    const { factory } = await seeded();
    await openStore({ now: NOW, indexedDB: factory, migrations: [explode] });
    const retry = await openStore({ now: NOW, indexedDB: factory, migrations: [rename] });
    expect(retry.ok).toBe(true);
  });

  test('migrations that are not contiguous from 1 are refused', async () => {
    const { before, factory } = await seeded();
    const gap: Migration = { from: 2, to: 3, migrate: (rows) => rows };
    const result = await openStore({ now: NOW, indexedDB: factory, migrations: [gap] });
    expect(result).toMatchObject({ ok: false, error: { code: 'migration-failed', step: 'plan' } });
    await expectUntouched(factory, before.rows);
  });
});
