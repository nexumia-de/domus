// The day a dish was cooked in the export file (format 4, docs/data-model.md#export-file): an
// export, a wipe of the device and an import with "Merge now" bring the days back; "replace
// everything" with a format 4 file makes them the file's; a file of format 3 (no days) still
// imports, and replacing with it leaves the days as they are.
// What it does not prove: fake-indexeddb and a memory shared store, an injected clock, one device;
// the browser half is e2e/dish-cooked.mjs (export and import in a browser are not driven there).
import { describe, expect, test } from 'vitest';
import { buildExport, parseExport, serializeExport } from '@culina/engine';
import { liveRecords } from '../src/exchange/export-file';
import { applyMerge, applyReplace, heldKinds } from '../src/exchange/json-apply';
import { setupMerge } from '../src/exchange/merge-model';
import { recordValidators } from '../src/exchange/validators';
import { fullSets } from '../src/screens/import/summary';
import { cookedOn, markCooked } from '../src/notebook';
import { startWithStock } from './stock-helpers';
import { must } from './must';

const AT = '2026-11-24T09:00:00.000Z';
const DISH = 'example-vegetable-plate';
const OTHER = 'example-flat-dough-with-sauce';

const exportText = async (): Promise<string> => {
  const live = await liveRecords();
  if (!live.ok) throw new Error(live.error.code);
  return serializeExport(buildExport(live.records, AT));
};
const mineNow = async () =>
  fullSets(must(await liveRecords().then((r) => (r.ok ? r.records : undefined))));

describe('the day a dish was cooked in the backup', () => {
  test('export, a new device, "Merge now": the day comes back', async () => {
    await startWithStock({ now: () => '2026-11-02T10:00:00.000Z' });
    await markCooked(DISH);
    const text = await exportText();
    expect(JSON.parse(text)).toMatchObject({
      formatVersion: 4,
      cooked: [{ id: `cooked-${DISH}`, dish: DISH, date: '2026-11-02' }],
    });
    await startWithStock({ examples: false });
    expect(cookedOn(DISH)).toBeUndefined();
    const read = parseExport(text, recordValidators);
    if (!read.ok) throw new Error(read.error.code);
    const mine = await mineNow();
    const { plan } = setupMerge(read.content.records, mine, new Map());
    must(await applyMerge(plan, new Map(), mine).then((r) => (r.ok ? r : undefined)));
    expect(cookedOn(DISH)).toBe('2026-11-02');
    // Control: the dish never cooked has no day after the round trip either.
    expect(cookedOn(OTHER)).toBeUndefined();
  });

  test('"replace everything" with a format 4 file makes the days the file\'s', async () => {
    const clock = { now: '2026-11-02T10:00:00.000Z' };
    await startWithStock({ now: () => clock.now });
    await markCooked(DISH);
    const text = await exportText();
    clock.now = '2026-11-24T10:00:00.000Z';
    await markCooked(DISH);
    await markCooked(OTHER);
    const read = parseExport(text, recordValidators);
    if (!read.ok) throw new Error(read.error.code);
    expect(heldKinds(read.content.fileVersion)).toContain('cooked');
    const done = await applyReplace(
      read.content.records,
      await mineNow(),
      read.content.fileVersion,
    );
    expect(done.ok).toBe(true);
    expect(cookedOn(DISH)).toBe('2026-11-02');
    expect(cookedOn(OTHER)).toBeUndefined();
  });

  test('a file of format 3 imports; replacing with it leaves the days as they are', async () => {
    await startWithStock();
    await markCooked(DISH);
    const day = cookedOn(DISH);
    const live = await liveRecords();
    if (!live.ok) throw new Error(live.error.code);
    // The same notebook as an app before 2026-11-24 wrote it: format 3, no `cooked`.
    const old = JSON.stringify({
      format: 'culina-export',
      formatVersion: 3,
      dishes: live.records.dishes,
      components: live.records.components,
      ingredients: live.records.ingredients,
    });
    const read = parseExport(old, recordValidators);
    if (!read.ok) throw new Error(read.error.code);
    expect(read.content.fileVersion).toBe(3);
    expect(read.content.records.cooked).toEqual([]);
    expect(heldKinds(3)).not.toContain('cooked');
    const done = await applyReplace(read.content.records, await mineNow(), 3);
    expect(done.ok).toBe(true);
    expect(cookedOn(DISH)).toBe(day);
  });

  test('a format 3 file that holds days is refused before anything is written', async () => {
    await startWithStock();
    const bad = JSON.stringify({
      format: 'culina-export',
      formatVersion: 3,
      cooked: [{ id: `cooked-${DISH}`, dish: DISH, date: '2026-11-02' }],
    });
    const read = parseExport(bad, recordValidators);
    expect(read.ok === false && read.error).toMatchObject({
      code: 'unknown-field',
      field: 'cooked',
    });
  });
});
