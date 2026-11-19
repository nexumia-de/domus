/* eslint-disable @typescript-eslint/no-non-null-assertion -- the fixtures are known; a missing entry should fail the test */
// The versions list, the diff, the family and the status filter as data
// (#26, #27): what each screen shows, without a browser.
import { expect, test } from 'vitest';
import { applyFilters, parseFilters, poolOf } from '../src/screens/browse/filters';
import { buildModel, type BrowseModel } from '../src/screens/browse/model';
import type { SpecData } from '../src/screens/browse/types';
import { familyVM } from '../src/screens/family/family-vm';
import { diffVM, riffSummary } from '../src/screens/versions/diff-vm';
import { versionsVM } from '../src/screens/versions/list-vm';
import { riffDraft } from '../src/screens/editor/draft';
import { fixtureInput } from './browse-fixture';

const line = (ingredientId: string, amount: number) => ({ ingredientId, amount, unit: 'ml' });
const spec = (
  id: string,
  lineage: string,
  version: number,
  extra: Partial<SpecData>,
): SpecData => ({
  id,
  lineageId: lineage,
  version,
  name: 'Mine',
  status: 'draft',
  lines: [line('rum', 60), line('lime', 22.5), line('simple', 22.5)],
  method: 'shake',
  templateId: 'daiquiri',
  ...extra,
});

function modelOf(user: SpecData[]): BrowseModel {
  const input = fixtureInput();
  const built = buildModel({
    ...input,
    specs: [...input.specs, ...user.map((value) => ({ value, origin: 'user' as const }))],
  });
  if (!built.ok) throw new Error(built.reason);
  return built.model;
}

const seedDaiquiri = (m: BrowseModel): SpecData =>
  [...m.specById.values()].find((s) => s.name === 'Daiquiri')!;

const mine = [
  spec('u1', 'u1', 1, { createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-01T10:00:00Z' }),
  spec('u2', 'u1', 2, {
    note: 'Less syrup',
    updatedAt: '2026-11-02T10:00:00Z',
    lines: [line('rum', 60), line('lime', 22.5), line('simple', 15)],
  }),
  spec('u3', 'u1', 3, {
    note: 'Lemon for lime',
    updatedAt: '2026-11-03T10:00:00Z',
    status: 'on-menu',
    statusLog: [
      { status: 'draft', at: '2026-11-01T10:00:00Z' },
      { status: 'on-menu', at: '2026-11-03T10:00:00Z' },
    ],
    lines: [line('rum', 60), line('lime', 30), line('simple', 15)],
  }),
];

test('the versions list is newest first with date, status, note, summary and the three figures', () => {
  const vm = versionsVM(modelOf(mine), 'u1')!;
  expect(vm.rows.map((r) => r.version)).toEqual([3, 2, 1]);
  expect(vm.rows[0]).toMatchObject({ note: 'Lemon for lime', status: 'On menu', newest: true });
  expect(vm.rows[0]!.figures.map((f) => f.name)).toEqual(['ABV', 'Sugar', 'Acid']);
  expect(vm.rows[0]!.summary).toBe('1 change');
  expect(vm.rows[2]!.summary).toBe('First version');
  expect(vm.rows[2]!.note).toBeUndefined();
  expect(vm.statusLog).toHaveLength(2);
  expect(vm.statusLog[1]).toContain('On menu');
  expect(versionsVM(modelOf(mine), 'nope')).toBeUndefined();
});

test('the diff names both ingredients of a swap and the figures change as numbers', () => {
  const m = modelOf([
    ...mine,
    spec('u9', 'u9', 1, { lines: [line('cognac', 60), line('lime', 22.5), line('simple', 15)] }),
  ]);
  const swapped = diffVM(m, m.specById.get('u2')!, m.specById.get('u9')!, 'metric');
  expect(swapped.empty).toBe(false);
  expect(swapped.lines).toHaveLength(1);
  expect(swapped.lines[0]).toMatchObject({ kind: 'changed', marker: '~', label: 'Changed' });
  expect(swapped.lines[0]!.text).toContain('Rum to Cognac');
  const abv = swapped.balance.figures.find((f) => f.key === 'abv')!;
  expect(abv.change).toMatch(/^Was .* → now /);
  const sugar = diffVM(
    m,
    m.specById.get('u1')!,
    m.specById.get('u2')!,
    'metric',
  ).balance.figures.find((f) => f.key === 'sugar')!;
  expect(sugar.change).toMatch(/^Was .* → now .*\(−/);
  expect(JSON.stringify(swapped)).not.toMatch(/\b(good|bad|wrong|better|worse)\b/i);
});

test('a changed amount, an added and a removed line are told with their word and shape', () => {
  const m = modelOf([
    ...mine,
    spec('u8', 'u8', 1, {
      lines: [line('rum', 60), line('lime', 22.5), line('vermouth', 5)],
      method: 'stir',
    }),
  ]);
  const d = diffVM(m, m.specById.get('u1')!, m.specById.get('u2')!, 'metric');
  expect(d.lines.map((l) => [l.kind, l.marker])).toEqual([['changed', '~']]);
  expect(d.lines[0]!.text).toContain('22.5 ml to 15 ml');
  const e = diffVM(m, m.specById.get('u1')!, m.specById.get('u8')!, 'metric');
  expect(e.lines.map((l) => l.label).sort()).toEqual(['Added', 'Removed']);
  expect(e.fields).toEqual(['Method: Shake to Stir']);
});

test('identical versions have no differences', () => {
  const m = modelOf(mine);
  const same = { ...m.specById.get('u1')!, id: 'copy' };
  expect(diffVM(m, m.specById.get('u1')!, same, 'metric').empty).toBe(true);
});

test('the family of a chain: grandparent, parent, the drink, its riffs in order of creation', () => {
  const m0 = modelOf([]);
  const parent = seedDaiquiri(m0);
  const m = modelOf([
    spec('r1', 'r1', 1, {
      name: 'Riff A',
      parentId: parent.id,
      createdAt: '2026-11-02T00:00:00Z',
      lines: [line('rum', 60), line('lime', 30), line('simple', 22.5)],
    }),
    spec('r2', 'r2', 1, { name: 'Riff B', parentId: 'r1', createdAt: '2026-11-03T00:00:00Z' }),
    spec('r3', 'r3', 1, { name: 'Riff C', parentId: 'r1', createdAt: '2026-11-04T00:00:00Z' }),
    spec('r4', 'r4', 1, { name: 'Riff D', parentId: 'r1', createdAt: '2026-11-05T00:00:00Z' }),
    spec('r5', 'r5', 1, { name: 'Riff E', parentId: 'r1', createdAt: '2026-11-06T00:00:00Z' }),
  ]);
  const vm = familyVM(m, 'r1', 'metric')!;
  expect(vm.entries.map((e) => [e.role, e.name])).toEqual([
    ['ancestor', 'Daiquiri'],
    ['self', 'Riff A'],
    ['child', 'Riff B'],
    ['child', 'Riff C'],
    ['child', 'Riff D'],
    ['child', 'Riff E'],
  ]);
  expect(vm.entries[1]!.change).toMatchObject({ count: 1, label: 'one change' });
  expect(vm.entries[1]!.change!.text).toContain('22.5 ml to 30 ml');
  const rows = familyVM(m, 'r2', 'metric')!;
  expect(rows.entries.filter((e) => e.role === 'sibling').map((e) => e.name)).toEqual([
    'Riff C',
    'Riff D',
    'Riff E',
  ]);
  expect(rows.entries.map((e) => e.depth).slice(0, 3)).toEqual([0, 1, 2]);
  expect(familyVM(m, 'nope', 'metric')).toBeUndefined();
});

test('a drink with no relatives is empty; a parent that is gone is said, the note kept', () => {
  const m = modelOf([
    ...mine,
    spec('g1', 'g1', 1, { name: 'Orphan', parentId: 'deleted', note: 'Riff on Gone v1' }),
  ]);
  expect(familyVM(m, 'u1', 'metric')!.empty).toBe(true);
  const orphan = familyVM(m, 'g1', 'metric')!;
  expect(orphan.entries[0]).toMatchObject({ parentGone: true, note: 'Riff on Gone v1' });
  expect(orphan.empty).toBe(false);
});

test('a riff of a built-in drink starts as a copy named "<name> riff" and changes nothing built in', () => {
  const m = modelOf([]);
  const parent = seedDaiquiri(m);
  const before = JSON.stringify(parent);
  const draft = riffDraft(parent);
  expect(draft.name).toBe('Daiquiri riff');
  expect(draft.target).toMatchObject({ kind: 'copy', fromId: parent.id, riff: true });
  expect(draft.lines).toHaveLength(parent.lines.length);
  expect(draft.status).toBe('draft');
  expect(JSON.stringify(parent)).toBe(before);
  expect(riffSummary(m, parent, parent, 'metric').label).toBe('no changes');
});

test('the status filter keeps retired drinks out of the list unless it asks for them', () => {
  const m = modelOf([...mine, spec('z1', 'z1', 1, { name: 'Old Drink', status: 'retired' })]);
  expect(m.drinks.some((d) => d.spec.name === 'Old Drink')).toBe(false);
  expect(m.byLineage.get('z1')?.spec.name).toBe('Old Drink');
  const names = (q: string): string[] => {
    const filters = parseFilters(new URLSearchParams(q));
    return applyFilters(m, filters, poolOf(m, filters)).map((d) => d.spec.name);
  };
  expect(names('status=retired')).toEqual(['Old Drink', 'Retired One']);
  expect(names('status=on-menu')).toEqual(['Mine']);
  expect(names('')).not.toContain('Old Drink');
  expect(names('status=draft')).not.toContain('Mine');
});
