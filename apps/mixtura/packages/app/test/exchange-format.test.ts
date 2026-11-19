// The app side of the exchange rules (rules themselves: packages/engine/test/exchange*.test.ts):
// the wrapper hands the real Ajv check to the engine, and the backup reminder.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { buildExport, FORMAT_VERSION, parseExportFile, reminderDue } from '../src/store';
import { openFresh, user } from './helpers';

const AT = '2026-11-17T09:30:00Z';
const good = () => buildExport(user, { exportedAt: AT, seedVersion: 'seed-1' });

test('a valid file parses with the app schema check and round-trips unchanged', () => {
  const result = parseExportFile(JSON.stringify(good()), 500);
  expect(result.ok && result.file).toEqual(good());
});

const legacy = readFileSync(
  fileURLToPath(
    new URL('../../engine/schemas/examples/legacy/export-v1-full.json', import.meta.url),
  ),
  'utf8',
);

test('a version 1 file is read into the given place and imports with its batches', async () => {
  const store = await openFresh();
  const selection = await store.placeSelection();
  const place = selection.places.find((p) => p.id === selection.entry);
  const parsed = parseExportFile(legacy, 500, { migrationInput: { placeForOldStock: place } });
  expect(parsed.ok && parsed.migratedFrom).toBe(1);
  if (!parsed.ok) return;
  expect(parsed.file.formatVersion).toBe(FORMAT_VERSION);
  await store.exchange.importData(parsed.file, 'replace');
  const stock = await store.stock.list();
  expect(stock).toHaveLength(2);
  expect(stock.every((r) => r.placeId === selection.entry)).toBe(true);
  expect(stock).toContainEqual(expect.objectContaining({ moreBatches: ['2026-10-20'] }));
});

test('a version 1 file without a place to put its stock in is refused', () => {
  expect(parseExportFile(legacy, 500)).toEqual({ ok: false, failure: { kind: 'needs-place' } });
});

test('a stock record with batches is stored, exported and refused when a date repeats', async () => {
  const store = await openFresh();
  const { entry } = await store.placeSelection();
  const record = {
    placeId: entry,
    ingredientId: 'lime-juice',
    updatedAt: AT,
    present: true,
    openedOn: '2026-11-10',
    moreBatches: ['2026-11-01'],
  };
  await store.stock.put(record);
  const file = await store.exchange.exportData({ exportedAt: AT });
  expect(file.stock).toContainEqual(record);
  await expect(
    store.stock.put({ ...record, moreBatches: ['2026-11-01', '2026-11-01'] }),
  ).rejects.toMatchObject({ kind: 'invalid' });
});

test('a file that breaks the schema is refused with the schema problems', () => {
  const r = parseExportFile(JSON.stringify({ ...good(), specs: 'none' }), 100);
  expect(r.ok === false && r.failure.kind).toBe('invalid');
  const extra = parseExportFile(JSON.stringify({ ...good(), extra: 1 }), 100);
  expect(extra.ok).toBe(false);
});

test('the reminder: only after real changes, 30 days, and not again once dismissed', () => {
  const day = 86_400_000;
  const now = Date.parse('2026-12-31T12:00:00Z');
  const ago = (d: number) => new Date(now - d * day).toISOString();
  expect(reminderDue({ changesSinceExport: 0, lastExportAt: ago(90) }, now)).toBe(false);
  expect(reminderDue({ changesSinceExport: 3, lastExportAt: ago(29) }, now)).toBe(false);
  expect(reminderDue({ changesSinceExport: 3, lastExportAt: ago(30) }, now)).toBe(true);
  expect(reminderDue({ changesSinceExport: 3, firstChangeAt: ago(10) }, now)).toBe(false);
  expect(reminderDue({ changesSinceExport: 3, firstChangeAt: ago(45) }, now)).toBe(true);
  expect(reminderDue({ changesSinceExport: 3 }, now)).toBe(false);
  const dismissed = { changesSinceExport: 3, lastExportAt: ago(90) };
  expect(reminderDue({ ...dismissed, dismissedAt: ago(2) }, now)).toBe(false);
  expect(reminderDue({ ...dismissed, dismissedAt: ago(31) }, now)).toBe(true);
});
