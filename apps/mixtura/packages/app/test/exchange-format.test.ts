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

test('a version 1 file is read and imported without its stock', async () => {
  const store = await openFresh();
  const parsed = parseExportFile(legacy, 500);
  expect(parsed.ok && parsed.migratedFrom).toBe(1);
  if (!parsed.ok) return;
  expect(parsed.file.formatVersion).toBe(FORMAT_VERSION);
  expect('stock' in parsed.file).toBe(false);
  const plan = await store.exchange.importData(parsed.file, 'replace');
  expect(plan.added.specs).toBeGreaterThan(0);
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
