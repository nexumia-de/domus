/* eslint-disable @typescript-eslint/no-non-null-assertion -- records are indexed at known positions */
// Versions in the store (#26, #27): numbering, immutability, status without a
// version, restore, prepared ingredients following the newest id, the backup
// counter, and that export and import carry versions, notes, status and the
// family.
import { buildFamily } from '@mixtura/engine';
import { expect, test } from 'vitest';
import {
  appendVersion,
  buildExport,
  parseExportFile,
  restoreVersion,
  setStatus,
  type Ingredient,
  type LocalStore,
  type Spec,
} from '../src/store';
import { openFresh } from './helpers';

const id = (n: number): string => `u-00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const line = (ingredientId: string, amount: number) => ({ ingredientId, amount, unit: 'ml' });
const content = (lineage: string, name: string, lines = [line('rum', 60)]): Spec =>
  ({ id: 'x', lineageId: lineage, version: 1, name, lines, status: 'draft' }) as unknown as Spec;
const T = (n: number): string => `2026-11-17T10:0${n}:00Z`;

async function drink(local: LocalStore, n: number, name = 'Daiquiri'): Promise<Spec> {
  return appendVersion(local, content(id(n), name), { id: id(n), at: T(0) });
}

test('version numbers are consecutive, each version points at the one before, content never changes', async () => {
  const local = await openFresh();
  const v1 = await drink(local, 1);
  const frozen = JSON.stringify(v1);
  const v2 = await appendVersion(local, content(id(1), 'Daiquiri', [line('rum', 50)]), {
    id: id(2),
    at: T(1),
    note: '  Less rum  ',
  });
  const v3 = await appendVersion(local, content(id(1), 'Daiquiri', [line('rum', 45)]), {
    id: id(3),
    at: T(2),
  });
  expect([v1.version, v2.version, v3.version]).toEqual([1, 2, 3]);
  expect([v1.parentId, v2.parentId, v3.parentId]).toEqual([undefined, id(1), id(2)]);
  expect(v2['note']).toBe('Less rum');
  expect(v3['note']).toBeUndefined();
  expect(v2.createdAt ?? v2['createdAt']).toBe(T(0));
  expect(v3['updatedAt']).toBe(T(2));
  expect(JSON.stringify(await local.specs.get(id(1)))).toBe(frozen);
  expect((await local.specs.versionsOf(id(1))).map((v) => v.version)).toEqual([1, 2, 3]);
  local.close();
});

test('the first version of a riff keeps the spec it riffs on as parent', async () => {
  const local = await openFresh();
  const riff = await appendVersion(
    local,
    { ...content(id(5), 'Daiquiri riff'), parentId: 'daiquiri' },
    { id: id(5), at: T(0), note: 'Riff on Daiquiri v1' },
  );
  expect(riff.parentId).toBe('daiquiri');
  expect(riff['note']).toBe('Riff on Daiquiri v1');
  local.close();
});

test('the status log starts with the first status and grows with every change', async () => {
  const local = await openFresh();
  await drink(local, 1);
  const set = await setStatus(local, id(1), 'on-menu', T(3));
  expect(set).toMatchObject({ status: 'on-menu', version: 1 });
  expect(await setStatus(local, id(1), 'on-menu', T(4))).toMatchObject({ status: 'on-menu' });
  const v2 = await appendVersion(
    local,
    { ...content(id(1), 'Daiquiri', [line('rum', 50)]), status: 'retired' },
    { id: id(2), at: T(5) },
  );
  expect(v2['statusLog']).toEqual([
    { status: 'draft', at: T(0) },
    { status: 'on-menu', at: T(3) },
    { status: 'retired', at: T(5) },
  ]);
  expect((await local.specs.versionsOf(id(1))).map((v) => v.version)).toEqual([1, 2]);
  local.close();
});

test('a status change writes the newest record only; no version is added', async () => {
  const local = await openFresh();
  await drink(local, 1);
  await appendVersion(local, content(id(1), 'Daiquiri', [line('rum', 50)]), {
    id: id(2),
    at: T(1),
  });
  const before = await local.specs.get(id(1));
  await setStatus(local, id(1), 'retired', T(2));
  expect(await local.specs.get(id(1))).toEqual(before);
  expect(await local.specs.get(id(2))).toMatchObject({ status: 'retired', version: 2 });
  expect(await local.specs.versionsOf(id(1))).toHaveLength(2);
  local.close();
});

test('restore adds a version with the old content and the note, and rewrites no history', async () => {
  const local = await openFresh();
  await drink(local, 1);
  await appendVersion(local, content(id(1), 'Daiquiri', [line('rum', 50)]), {
    id: id(2),
    at: T(1),
    note: 'Less rum',
  });
  await setStatus(local, id(1), 'on-menu', T(2));
  const before = JSON.stringify(await local.specs.versionsOf(id(1)));
  const restored = await restoreVersion(
    local,
    id(1),
    1,
    { id: id(3), at: T(3) },
    'Restored from v1',
  );
  expect(restored).toMatchObject({ version: 3, status: 'on-menu', note: 'Restored from v1' });
  expect(restored!['lines']).toEqual([line('rum', 60)]);
  const all = await local.specs.versionsOf(id(1));
  expect(all).toHaveLength(3);
  expect(JSON.stringify(all.slice(0, 2))).toBe(before);
  expect(await restoreVersion(local, id(1), 9, { id: id(4), at: T(4) }, 'x')).toBeUndefined();
  local.close();
});

test('a prepared ingredient follows the newest version: prepared.specId is rewritten', async () => {
  const local = await openFresh();
  await drink(local, 1, 'Syrup');
  const item = {
    id: id(20),
    name: 'Syrup',
    level: 'product',
    prepared: { specId: id(1), yield: { amount: 100, unit: 'ml' } },
  } as unknown as Ingredient;
  await local.ingredients.put(item);
  await appendVersion(local, content(id(1), 'Syrup', [line('rum', 40)]), { id: id(2), at: T(1) });
  expect((await local.ingredients.get(id(20)))!.prepared!.specId).toBe(id(2));
  await restoreVersion(local, id(1), 1, { id: id(3), at: T(2) }, 'Restored from v1');
  expect((await local.ingredients.get(id(20)))!.prepared!.specId).toBe(id(3));
  local.close();
});

test('the backup counter counts every version save and a status change', async () => {
  const local = await openFresh();
  await drink(local, 1);
  await appendVersion(local, content(id(1), 'Daiquiri', [line('rum', 50)]), {
    id: id(2),
    at: T(1),
  });
  await setStatus(local, id(1), 'on-menu', T(2));
  expect((await local.backup.load()).changesSinceExport).toBe(3);
  local.close();
});

test('export, wipe, import restores versions, notes, status and the family', async () => {
  const a = await openFresh();
  await drink(a, 1);
  await appendVersion(a, content(id(1), 'Daiquiri', [line('rum', 50)]), {
    id: id(2),
    at: T(1),
    note: 'Less rum',
  });
  await setStatus(a, id(1), 'on-menu', T(2));
  await appendVersion(
    a,
    { ...content(id(7), 'Daiquiri riff'), parentId: id(2) },
    { id: id(7), at: T(3), note: 'Riff on Daiquiri v2' },
  );
  await appendVersion(
    a,
    { ...content(id(8), 'Riff of riff'), parentId: id(7) },
    { id: id(8), at: T(4) },
  );
  const exported = await a.exchange.exportData({ exportedAt: T(5) });
  const parsed = parseExportFile(JSON.stringify(exported), 1000);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  const b = await openFresh();
  await b.exchange.importData(parsed.file, 'replace');
  const specs = await b.specs.list();
  expect(specs).toHaveLength(4);
  const v2 = specs.find((s) => s.id === id(2))!;
  expect(v2).toMatchObject({ note: 'Less rum', status: 'on-menu', version: 2 });
  expect(v2['statusLog']).toHaveLength(2);
  const family = buildFamily(specs as never, id(8));
  expect(family.ancestors).toEqual([id(1), id(7)]);
  expect(buildFamily(specs as never, id(1)).children).toEqual([id(7)]);
  expect(buildExport({ ...(await snapshot(b)) }, { exportedAt: T(5) }).specs).toHaveLength(4);
  a.close();
  b.close();
});

async function snapshot(store: LocalStore) {
  return {
    ingredients: await store.ingredients.list(),
    templates: await store.templates.list(),
    specs: await store.specs.list(),
    affinities: await store.affinities.list(),
  };
}

test("an import with riffs that are each other's ancestors is refused and names the drinks", async () => {
  const a = await openFresh();
  await a.specs.put({ ...content(id(1), 'Alpha'), id: id(1), parentId: id(2) });
  await a.specs.put({ ...content(id(2), 'Beta'), id: id(2), parentId: id(1) });
  const exported = await a.exchange.exportData({ exportedAt: T(0) });
  const parsed = parseExportFile(JSON.stringify(exported), 1000);
  expect(parsed.ok).toBe(false);
  if (parsed.ok || parsed.failure.kind !== 'invalid') throw new Error('expected an invalid file');
  expect(parsed.failure.problems.join(' ')).toMatch(/Alpha, Beta|Beta, Alpha/);
  a.close();
});
