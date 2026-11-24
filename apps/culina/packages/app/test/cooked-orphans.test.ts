// "The date, no more": a day of cooking without a live dish is dropped (docs/data-model.md, Date a
// dish was cooked): not exported, not kept by "replace everything" (also with a file older than
// format 4), not taken by a merge; Undo of the replace brings the day back with its dish.
// What it does not prove: fake-indexeddb and a memory shared store, an injected clock; the import
// screen in a browser (it calls these functions).
import { describe, expect, test } from 'vitest';
import { cookedRecord, parseExport, serializeExport, buildExport } from '@culina/engine';
import type { ExportRecord } from '@culina/engine';
import { liveRecords } from '../src/exchange/export-file';
import { applyMerge, applyReplace, undoImport } from '../src/exchange/json-apply';
import { setupMerge } from '../src/exchange/merge-model';
import { recordValidators } from '../src/exchange/validators';
import { fullSets } from '../src/screens/import/summary';
import { cookedOn, markCooked } from '../src/notebook';
import { state } from '../src/notebook/state';
import { startWithStock } from './stock-helpers';
import { must } from './must';

const DISH = 'example-vegetable-plate';
const OTHER = 'example-flat-dough-with-sauce';
const GONE = 'u-00000000-0000-4000-8000-0000000000ff';
const day = (family: string, date: string): ExportRecord => ({ ...cookedRecord(family, date) });
const mineNow = async () =>
  fullSets(must(await liveRecords().then((r) => (r.ok ? r.records : undefined))));
const storedDays = async (): Promise<string[]> => {
  const listed = await must(state.store).list('cooked');
  return listed.ok ? listed.records.map((r) => String(r.dish)).sort() : [];
};

describe('a day without its dish', () => {
  test('is not exported; the day of a live dish is', async () => {
    await startWithStock();
    await markCooked(DISH);
    // A remnant written by an older state of the code, or by another tab.
    expect((await must(state.store).put('cooked', cookedRecord(GONE, '2026-11-01'))).ok).toBe(true);
    const live = await liveRecords();
    if (!live.ok) throw new Error(live.error.code);
    expect((live.records.cooked ?? []).map((r) => r.dish)).toEqual([DISH]);
  });

  test('"replace everything" with a format 3 file drops the days of the dishes it removes; Undo brings them back', async () => {
    await startWithStock();
    await markCooked(DISH);
    await markCooked(OTHER);
    const mine = await mineNow();
    // A format 3 file that holds only OTHER of the two dishes.
    const old = JSON.stringify({
      format: 'culina-export',
      formatVersion: 3,
      ingredients: mine.ingredients,
      components: mine.components,
      dishes: mine.dishes.filter((d) => d.id === OTHER),
    });
    const read = parseExport(old, recordValidators);
    if (!read.ok) throw new Error(read.error.code);
    expect((await applyReplace(read.content.records, mine, 3)).ok).toBe(true);
    expect(await storedDays()).toEqual([OTHER]);
    expect(cookedOn(OTHER)).toBeDefined();
    expect((await undoImport()).ok).toBe(true);
    expect(await storedDays()).toEqual([OTHER, DISH].sort());
    expect(cookedOn(DISH)).toBeDefined();
  });

  test('"replace everything" with a format 4 file keeps only its days of its dishes', async () => {
    await startWithStock();
    const mine = await mineNow();
    const text = serializeExport(
      buildExport(
        {
          ...mine,
          cooked: [day(DISH, '2026-11-02'), day(GONE, '2026-11-03')],
        },
        '2026-11-24T09:00:00.000Z',
      ),
    );
    const read = parseExport(text, recordValidators);
    if (!read.ok) throw new Error(read.error.code);
    expect((await applyReplace(read.content.records, mine, read.content.fileVersion)).ok).toBe(
      true,
    );
    expect(await storedDays()).toEqual([DISH]);
  });

  test('a merge takes a day only for a dish that is here or comes with the file', async () => {
    await startWithStock();
    const mine = await mineNow();
    const file = fullSets({
      cooked: [day(DISH, '2026-11-02'), day(GONE, '2026-11-03')],
    });
    const { plan } = setupMerge(file, mine, new Map());
    const done = await applyMerge(plan, new Map(), mine);
    expect(done.ok).toBe(true);
    expect(await storedDays()).toEqual([DISH]);
    expect(cookedOn(DISH)).toBe('2026-11-02');
  });
});
