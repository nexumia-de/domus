// The backup round trip a tester ran on 2026-11-21: export everything, delete the browser's data,
// import the file with "Merge now", and compare everything the file promises: every record of the
// notebook and the techniques marked as learned. The stock is not in the file (it is the shared
// collection of a space, docs/decisions/stock-in-spaces.md); the test says so instead of comparing it.
// What it does not prove: fake-indexeddb, not a browser's IndexedDB; an injected clock; one device.
// The browser half is e2e/export-import.mjs.
import { describe, expect, test } from 'vitest';
import { buildExport, parseExport, serializeExport, skillRecord } from '@culina/engine';
import { liveRecords } from '../src/exchange/export-file';
import { applyMerge, applyReplace } from '../src/exchange/json-apply';
import { setupMerge } from '../src/exchange/merge-model';
import { recordValidators } from '../src/exchange/validators';
import { fullSets } from '../src/screens/import/summary';
import { learnedSkills, setLearned } from '../src/notebook';
import { state } from '../src/notebook/state';
import { startWithStock } from './stock-helpers';
import { must } from './must';

const AT = '2026-11-21T09:00:00.000Z';

/** Exports, starts again on an empty device (the developer tools' "delete database"), merges. */
const roundTrip = async (): Promise<void> => {
  const live = await liveRecords();
  if (!live.ok) throw new Error(live.error.code);
  const text = serializeExport(buildExport(live.records, AT));
  await startWithStock({ examples: false });
  expect(learnedSkills().size).toBe(0);
  const read = parseExport(text, recordValidators);
  if (!read.ok) throw new Error(read.error.code);
  const mine = fullSets(must(await liveRecords().then((r) => (r.ok ? r.records : undefined))));
  const { plan } = setupMerge(read.content.records, mine, new Map());
  const done = await applyMerge(plan, new Map(), mine);
  if (!done.ok) throw new Error(done.error.code);
};

describe('export, erase the device, import with Merge now', () => {
  test('every record and every technique marked as learned come back', async () => {
    await startWithStock();
    must(await setLearned('pan-fry', true).then((r) => (r.ok ? r : undefined)));
    must(await setLearned('fold-in', true).then((r) => (r.ok ? r : undefined)));
    // A mark taken back is a record too ("Teach again"); it must come back as taken back.
    must(await setLearned('sear', true).then((r) => (r.ok ? r : undefined)));
    must(await setLearned('sear', false).then((r) => (r.ok ? r : undefined)));
    const before = await liveRecords();
    if (!before.ok) throw new Error(before.error.code);
    const skillsBefore = [...state.skills].sort((a, b) => (a.id < b.id ? -1 : 1));

    await roundTrip();

    const after = await liveRecords();
    if (!after.ok) throw new Error(after.error.code);
    for (const kind of ['ingredients', 'components', 'dishes', 'tastings'] as const) {
      expect(after.records[kind], kind).toEqual(before.records[kind]);
    }
    expect([...learnedSkills()].sort()).toEqual(['fold-in', 'pan-fry']);
    expect([...state.skills].sort((a, b) => (a.id < b.id ? -1 : 1))).toEqual(skillsBefore);
    expect(state.skills).toContainEqual(skillRecord('sear', false));
  });

  test('control: the notebook records alone came back before the fix too', async () => {
    await startWithStock();
    const before = await liveRecords();
    if (!before.ok) throw new Error(before.error.code);
    await roundTrip();
    const after = await liveRecords();
    if (!after.ok) throw new Error(after.error.code);
    expect(after.records.components).toEqual(before.records.components);
    expect(after.records.ingredients).toEqual(before.records.ingredients);
  });

  test("replace with a format 3 file makes the skill state the file's", async () => {
    await startWithStock();
    await setLearned('pan-fry', true);
    const live = await liveRecords();
    if (!live.ok) throw new Error(live.error.code);
    const text = serializeExport(buildExport(live.records, AT));
    await setLearned('pan-fry', false);
    await setLearned('fold-in', true);
    const read = parseExport(text, recordValidators);
    if (!read.ok) throw new Error(read.error.code);
    expect(read.content.fileVersion).toBe(3);
    const mine = fullSets(must(await liveRecords().then((r) => (r.ok ? r.records : undefined))));
    expect((await applyReplace(read.content.records, mine, read.content.fileVersion)).ok).toBe(
      true,
    );
    expect([...learnedSkills()]).toEqual(['pan-fry']);
  });

  test('a file of format 2 still imports; replace with it leaves the skill state as it is', async () => {
    await startWithStock({ examples: false });
    await setLearned('pan-fry', true);
    const old = JSON.stringify({
      format: 'culina-export',
      formatVersion: 2,
      ingredients: [{ id: 'u-00000000-0000-4000-8000-000000000001', name: 'Old flour' }],
    });
    const read = parseExport(old, recordValidators);
    if (!read.ok) throw new Error(read.error.code);
    expect(read.content.fileVersion).toBe(2);
    const mine = fullSets(must(await liveRecords().then((r) => (r.ok ? r.records : undefined))));
    expect((await applyReplace(read.content.records, mine, read.content.fileVersion)).ok).toBe(
      true,
    );
    expect(state.ingredients.map((i) => i.name)).toEqual(['Old flour']);
    expect([...learnedSkills()]).toEqual(['pan-fry']);
  });

  test('a mark that differs is a conflict the user decides, never newer-wins', async () => {
    await startWithStock({ examples: false });
    await setLearned('pan-fry', true);
    const live = await liveRecords();
    if (!live.ok) throw new Error(live.error.code);
    const text = serializeExport(buildExport(live.records, AT));
    await setLearned('pan-fry', false);
    const read = parseExport(text, recordValidators);
    if (!read.ok) throw new Error(read.error.code);
    const mine = fullSets(must(await liveRecords().then((r) => (r.ok ? r.records : undefined))));
    const { plan } = setupMerge(read.content.records, mine, new Map());
    expect(plan.conflicts.map((c) => [c.kind, c.id, c.immutable])).toEqual([
      ['skills', 'skill-pan-fry', false],
    ]);
    await applyMerge(plan, new Map([['skills/skill-pan-fry', 'theirs']]), mine);
    expect([...learnedSkills()]).toEqual(['pan-fry']);
  });
});
