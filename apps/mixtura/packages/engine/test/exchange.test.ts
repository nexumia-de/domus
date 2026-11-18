/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are indexed at known positions */
// The export rules with the real schema check (Ajv over packages/engine/schemas).
// The rules that do not depend on the schema have vectors in vectors/exchange/.
import { expect, test } from 'vitest';
import {
  buildExport,
  countsOf,
  exportFileName,
  FORMAT_VERSION,
  migrateFile,
  parseExportFile,
  planImport,
  type ExportFile,
  type Snapshot,
} from '../src/index';
import { makeAjv, readJson, schemasDir } from './schema-helpers';

const user = readJson(`${schemasDir}examples/valid/export-full.json`) as Snapshot;
const ajv = makeAjv();
const check = ajv.getSchema('urn:mixtura:export')!;
const schemaProblems = (value: unknown): string[] =>
  check(value) ? [] : (check.errors ?? []).map((e) => `${e.instancePath || '(file)'} ${e.message}`);

const AT = '2026-11-17T09:30:00Z';
const good = (): ExportFile => buildExport(user, { exportedAt: AT, seedVersion: 'seed-1' });
const text = (value: unknown): string => JSON.stringify(value);
const parse = (value: unknown, bytes = 100) => parseExportFile(text(value), bytes, schemaProblems);

test('the export has the format version, the host instant and only user data', () => {
  const file = good();
  expect(file.app).toBe('mixtura');
  expect(file.formatVersion).toBe(FORMAT_VERSION);
  expect(file.exportedAt).toBe(AT);
  expect(file.seedVersion).toBe('seed-1');
  expect(countsOf(file)).toEqual(countsOf(user));
  expect(Object.keys(file).sort()).toEqual([
    'affinities',
    'app',
    'exportedAt',
    'formatVersion',
    'ingredients',
    'places',
    'seedVersion',
    'specs',
    'stock',
    'templates',
  ]);
  expect(buildExport(user, { exportedAt: AT }).seedVersion).toBeUndefined();
});

test('the export is stable: the same data gives the same text in any order', () => {
  const shuffled = { ...user, specs: [...user.specs].reverse(), stock: [...user.stock].reverse() };
  expect(text(buildExport(shuffled, { exportedAt: AT }))).toBe(
    text(buildExport(user, { exportedAt: AT })),
  );
});

test('file name from the exported date', () => {
  expect(exportFileName(AT)).toBe('mixtura-backup-2026-11-17.json');
});

test('a valid file parses and round-trips unchanged', () => {
  const result = parseExportFile(text(good()), 500, schemaProblems);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.file).toEqual(good());
    expect(result.migratedFrom).toBeNull();
  }
});

test('refusals are named', () => {
  const kind = (r: ReturnType<typeof parse>) => (r.ok ? 'ok' : r.failure.kind);
  expect(kind(parseExportFile('{nope', 5, schemaProblems))).toBe('unreadable');
  expect(kind(parseExportFile('[]', 2, schemaProblems))).toBe('not-mixtura');
  expect(kind(parseExportFile('null', 4, schemaProblems))).toBe('not-mixtura');
  expect(kind(parse({ ...good(), app: 'culina' }))).toBe('not-mixtura');
  expect(kind(parse({ ...good(), formatVersion: 'one' }))).toBe('invalid');
  expect(kind(parse({ ...good(), formatVersion: 0 }))).toBe('invalid');
  expect(kind(parse({ ...good(), specs: 'none' }))).toBe('invalid');
  const withoutStock: Partial<ExportFile> = good();
  delete withoutStock.stock;
  expect(kind(parse(withoutStock))).toBe('invalid');
  expect(kind(parse({ ...good(), extra: 1 }))).toBe('invalid');
});

test('a file from a newer format is refused with both versions', () => {
  const r = parse({ ...good(), formatVersion: FORMAT_VERSION + 2 });
  expect(r).toEqual({
    ok: false,
    failure: { kind: 'newer', found: FORMAT_VERSION + 2, supported: FORMAT_VERSION },
  });
});

test('a file above the size limit is refused before parsing', () => {
  const r = parseExportFile('{', 11 * 1024 * 1024, schemaProblems);
  expect(r.ok === false && r.failure.kind).toBe('too-large');
  expect(parseExportFile('x'.repeat(50), 1, schemaProblems, { limit: 10 }).ok).toBe(false);
});

test('keys that could reach the prototype are refused anywhere in the file', () => {
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const raw = text(good()).replace(
      '"app":"mixtura"',
      `"app":"mixtura","x":{"${key}":{"polluted":true}}`,
    );
    const r = parseExportFile(raw, raw.length, schemaProblems);
    expect(r.ok === false && r.failure.kind).toBe('unreadable');
  }
  expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
});

test('ids must follow the user-id rule, except the key of a stock record', () => {
  const bad = good();
  bad.ingredients[0] = { ...bad.ingredients[0]!, id: 'lemon-juice' };
  const r = parse(bad);
  expect(r.ok).toBe(false);
  if (!r.ok && r.failure.kind === 'invalid') {
    expect(r.failure.problems.join('\n')).toMatch(/not a user id|pattern/);
  }
  const seedStock = good();
  expect(seedStock.stock.some((s) => !s.ingredientId.startsWith('u-'))).toBe(true);
  expect(parse(seedStock).ok).toBe(true);
});

test('repeated ids and repeated version slots are refused', () => {
  const dup = good();
  dup.specs.push({ ...dup.specs[0]!, id: 'u-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
  const r = parse(dup);
  expect(r.ok === false && r.failure.kind).toBe('invalid');
  const same = good();
  same.stock.push({ ...same.stock[0]! });
  expect(parse(same).ok).toBe(false);
});

test('an older format is migrated step by step, and a gap is an error', () => {
  const steps = [
    (f: Record<string, unknown>) => ({ ...f, two: true }),
    (f: Record<string, unknown>) => ({ ...f, three: true }),
  ];
  const out = migrateFile({ a: 1, formatVersion: 1 }, 1, 3, steps);
  expect(out).toEqual({ a: 1, formatVersion: 3, two: true, three: true });
  expect(migrateFile({ formatVersion: 2 }, 2, 3, steps)).toMatchObject({ three: true });
  expect(() => migrateFile({}, 1, 4, steps)).toThrow(/No migration/);
});

test('merge never replaces with an older spec and never takes over a version slot', () => {
  const [v1] = user.specs;
  const current = { ...user, specs: [{ ...v1!, updatedAt: '2026-06-01T00:00:00Z', name: 'New' }] };
  const older = { ...user, specs: [{ ...v1!, updatedAt: '2026-01-01T00:00:00Z', name: 'Old' }] };
  expect(planImport(current, older, 'merge').skipped.specs).toBe(1);
});

type Live = Extract<ExportFile['stock'][number], { present: boolean }>;
const withBatches = (file: ExportFile): Live =>
  file.stock.find((x): x is Live => !x.deleted && !!x.moreBatches) as Live;

test('a stock record may carry more batches, a repeated or false date is refused', () => {
  const kept = structuredClone(good());
  expect(kept.formatVersion).toBe(FORMAT_VERSION);
  expect(withBatches(kept).moreBatches?.length).toBeGreaterThan(0);
  expect(parse(kept).ok).toBe(true);
  const twice = structuredClone(good());
  withBatches(twice).moreBatches = ['2026-10-20', '2026-10-20'];
  expect(parse(twice).ok).toBe(false);
  const bad = structuredClone(good());
  withBatches(bad).moreBatches = ['20 October'];
  expect(parse(bad).ok).toBe(false);
});

test('a tombstone has no other fields and a live record needs present', () => {
  const tomb = structuredClone(good());
  const t = tomb.stock.find((x) => x.deleted);
  expect(t).toBeDefined();
  expect(parse(tomb).ok).toBe(true);
  tomb.stock[tomb.stock.indexOf(t!)] = { ...t!, present: true } as never;
  expect(parse(tomb).ok).toBe(false);
  const live = structuredClone(good());
  const l = live.stock.find((x) => !x.deleted)!;
  Reflect.deleteProperty(l, 'present');
  expect(parse(live).ok).toBe(false);
});

const legacy = readJson(`${schemasDir}examples/legacy/export-v1-full.json`);
const OLD_PLACE = { id: 'u-7c0d1e2f-3a4b-4c5d-8e6f-0a1b2c3d4e5f', name: 'Home', updatedAt: AT };

test('a version 1 file is read with the given place and refused without one', () => {
  const r = parseExportFile(text(legacy), 500, schemaProblems, {
    migrationInput: { placeForOldStock: OLD_PLACE },
  });
  expect(r.ok && r.migratedFrom).toBe(1);
  if (r.ok) {
    expect(r.file.formatVersion).toBe(2);
    expect(r.file.places).toEqual([OLD_PLACE]);
    expect(r.file.stock).toHaveLength(2);
    expect(r.file.stock.every((s) => s.placeId === OLD_PLACE.id)).toBe(true);
    expect(withBatches(r.file).moreBatches).toEqual(['2026-10-20']);
  }
  const none = parseExportFile(text(legacy), 500, schemaProblems);
  expect(none).toEqual({ ok: false, failure: { kind: 'needs-place' } });
});
