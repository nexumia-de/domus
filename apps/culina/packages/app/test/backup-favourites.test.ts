// The favourites in the export file (format 5, docs/data-model.md#export-file) and the "no mark
// without its dish" rule for own dishes: an export, a wipe and "Merge now" bring the marks back;
// "replace everything" with a format 5 file makes them the file's; a file of format 4 (no marks)
// still imports and replacing with it leaves the marks as they are; the mark of an own dish without
// a live dish is dropped, the mark of a shipped dish is kept.
// What it does not prove: fake-indexeddb and a memory shared store, an injected clock, one device;
// the import screen in a browser (it calls these functions).
import { describe, expect, test } from 'vitest';
import {
  buildExport,
  favouriteRecord,
  parseExport,
  serializeExport,
  type ExportRecord,
} from '@culina/engine';
import { liveRecords } from '../src/exchange/export-file';
import { applyMerge, applyReplace, heldKinds, undoImport } from '../src/exchange/json-apply';
import { setupMerge } from '../src/exchange/merge-model';
import { recordValidators } from '../src/exchange/validators';
import { fullSets } from '../src/screens/import/summary';
import { isFavourite, setFavourite } from '../src/notebook';
import { state } from '../src/notebook/state';
import { startWithStock } from './stock-helpers';
import { must } from './must';

const AT = '2026-11-27T09:00:00.000Z';
const DISH = 'example-vegetable-plate';
const OTHER = 'example-flat-dough-with-sauce';
const SHIPPED = 'risotto';
const GONE = 'u-00000000-0000-4000-8000-0000000000ff';
const mark = (origin: 'own' | 'shipped', dish: string): ExportRecord => ({
  ...favouriteRecord(origin, dish),
});

const exportText = async (): Promise<string> => {
  const live = await liveRecords();
  if (!live.ok) throw new Error(live.error.code);
  return serializeExport(buildExport(live.records, AT));
};
const mineNow = async () =>
  fullSets(must(await liveRecords().then((r) => (r.ok ? r.records : undefined))));
const storedMarks = async (): Promise<string[]> => {
  const listed = await must(state.store).list('favourites');
  return listed.ok ? listed.records.map((r) => String(r.id)).sort() : [];
};
const read = (text: string) => {
  const parsed = parseExport(text, recordValidators);
  if (!parsed.ok) throw new Error(parsed.error.code);
  return parsed.content;
};

describe('the favourites in the backup', () => {
  test('export, a new device, "Merge now": the marks come back', async () => {
    await startWithStock();
    await setFavourite('own', DISH, true);
    await setFavourite('shipped', SHIPPED, true);
    const text = await exportText();
    expect(JSON.parse(text)).toMatchObject({
      formatVersion: 5,
      favourites: expect.arrayContaining([
        { id: `favourite-own-${DISH}`, origin: 'own', dish: DISH },
        { id: `favourite-shipped-${SHIPPED}`, origin: 'shipped', dish: SHIPPED },
      ]),
    });
    await startWithStock({ examples: false });
    expect(isFavourite('own', DISH)).toBe(false);
    const mine = await mineNow();
    const { plan } = setupMerge(read(text).records, mine, new Map());
    must(await applyMerge(plan, new Map(), mine).then((r) => (r.ok ? r : undefined)));
    expect(isFavourite('own', DISH)).toBe(true);
    expect(isFavourite('shipped', SHIPPED)).toBe(true);
    // Control: a dish never marked has no mark after the round trip either.
    expect(isFavourite('own', OTHER)).toBe(false);
  });

  test('"replace everything" with a format 5 file makes the marks the file\'s', async () => {
    await startWithStock();
    await setFavourite('own', DISH, true);
    const content = read(await exportText());
    await setFavourite('own', OTHER, true);
    await setFavourite('shipped', SHIPPED, true);
    expect(heldKinds(content.fileVersion)).toContain('favourites');
    expect((await applyReplace(content.records, await mineNow(), content.fileVersion)).ok).toBe(
      true,
    );
    expect(await storedMarks()).toEqual([`favourite-own-${DISH}`]);
  });

  test('a file of format 4 imports; replacing with it leaves the marks as they are', async () => {
    await startWithStock();
    await setFavourite('own', DISH, true);
    await setFavourite('shipped', SHIPPED, true);
    const mine = await mineNow();
    const old = JSON.stringify({
      format: 'culina-export',
      formatVersion: 4,
      dishes: mine.dishes,
      components: mine.components,
      ingredients: mine.ingredients,
    });
    const content = read(old);
    expect(content.fileVersion).toBe(4);
    expect(content.records.favourites).toEqual([]);
    expect(heldKinds(4)).not.toContain('favourites');
    expect((await applyReplace(content.records, mine, 4)).ok).toBe(true);
    expect(await storedMarks()).toEqual(
      [`favourite-own-${DISH}`, `favourite-shipped-${SHIPPED}`].sort(),
    );
  });

  test('a format 4 file that holds marks is refused before anything is written', () => {
    const bad = JSON.stringify({
      format: 'culina-export',
      formatVersion: 4,
      favourites: [mark('shipped', SHIPPED)],
    });
    const done = parseExport(bad, recordValidators);
    expect(done.ok === false && done.error).toMatchObject({
      code: 'unknown-field',
      field: 'favourites',
    });
  });

  test('a mark that carries a date is refused', () => {
    const bad = JSON.stringify({
      format: 'culina-export',
      formatVersion: 5,
      favourites: [{ ...mark('shipped', SHIPPED), date: '2026-11-27' }],
    });
    expect(parseExport(bad, recordValidators).ok).toBe(false);
  });
});

describe('a mark of an own dish without its dish', () => {
  test('is not exported; the mark of a live dish and of a shipped dish are', async () => {
    await startWithStock();
    await setFavourite('own', DISH, true);
    await setFavourite('shipped', SHIPPED, true);
    expect((await must(state.store).put('favourites', favouriteRecord('own', GONE))).ok).toBe(true);
    const live = await liveRecords();
    if (!live.ok) throw new Error(live.error.code);
    expect((live.records.favourites ?? []).map((r) => r.dish).sort()).toEqual(
      [DISH, SHIPPED].sort(),
    );
  });

  test('"replace everything" with a format 4 file drops the marks of the dishes it removes; Undo brings them back', async () => {
    await startWithStock();
    await setFavourite('own', DISH, true);
    await setFavourite('own', OTHER, true);
    await setFavourite('shipped', SHIPPED, true);
    const mine = await mineNow();
    const old = JSON.stringify({
      format: 'culina-export',
      formatVersion: 4,
      ingredients: mine.ingredients,
      components: mine.components,
      dishes: mine.dishes.filter((d) => d.id === OTHER),
    });
    const content = read(old);
    expect((await applyReplace(content.records, mine, 4)).ok).toBe(true);
    expect(await storedMarks()).toEqual(
      [`favourite-own-${OTHER}`, `favourite-shipped-${SHIPPED}`].sort(),
    );
    expect((await undoImport()).ok).toBe(true);
    expect(await storedMarks()).toEqual(
      [`favourite-own-${DISH}`, `favourite-own-${OTHER}`, `favourite-shipped-${SHIPPED}`].sort(),
    );
  });

  test('a merge takes a mark only for an own dish that is here or comes with the file', async () => {
    await startWithStock();
    const mine = await mineNow();
    const file = fullSets({
      favourites: [mark('own', DISH), mark('own', GONE), mark('shipped', SHIPPED)],
    });
    const { plan } = setupMerge(file, mine, new Map());
    expect((await applyMerge(plan, new Map(), mine)).ok).toBe(true);
    expect(await storedMarks()).toEqual(
      [`favourite-own-${DISH}`, `favourite-shipped-${SHIPPED}`].sort(),
    );
  });
});
