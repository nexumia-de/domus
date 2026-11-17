import { expect, test } from 'vitest';
import { closedSheet, parseHash } from '../src/router';
import { listKey } from '../src/shell/scroll';
import type { Template } from '../src/screens/browse/types';
import { templateRows, templateVM } from '../src/screens/templates/view-model';
import { fixtureModel, seedModel } from './browse-fixture';

const seed = seedModel();

test('the overview lists root templates by name with their variants under them', () => {
  const rows = templateRows(seed, '');
  expect(rows.map((r) => `${r.variant ? '  ' : ''}${r.name}`)).toEqual([
    'Daiquiri',
    '  Non-alcoholic sour',
    '  Sidecar',
    'Flip',
    '  Non-alcoholic foamed drink',
    'Highball',
    '  Non-alcoholic highball or spritz',
    'Martini',
    '  Low-ABV stirred drink',
    'Old-Fashioned',
  ]);
});

test('a row has the role line, the method and the number of drinks that follow it', () => {
  const rows = templateRows(seed, '');
  expect(rows.find((r) => r.id === 'daiquiri')).toMatchObject({
    roles: 'Base, Sour, Sweet',
    method: 'Shake',
    drinks: 24,
    user: false,
  });
  expect(rows.find((r) => r.id === 'flip')?.drinks).toBe(1);
});

test('search filters the overview by name, without case or accents', () => {
  expect(templateRows(seed, 'MARTI').map((r) => r.id)).toEqual(['martini']);
  expect(templateRows(seed, 'zzz')).toEqual([]);
});

test('the detail has slots, ranges as bands and the basis of the ranges', () => {
  const vm = templateVM(seed, seed.templateById.get('daiquiri') as Template);
  expect(vm.slots[0]).toEqual({ role: 'Base', parts: '2', optional: false, note: undefined });
  expect(vm.slots[1]).toMatchObject({
    role: 'Sour',
    parts: '0.38 to 1.5',
    note: '3/4 oz citrus juice',
  });
  expect(vm.ranges.map((r) => r.text)).toEqual([
    'Usual range 17.6–19.0 %',
    'Usual range 10.4–11.2 g/100 ml',
    'Usual range 0.99–1.07 %',
  ]);
  expect(vm.ranges[0]?.track.bandLeft).toBeCloseTo(33.3, 1);
  expect(vm.basis[0]).toContain('assumption, unverified');
  expect(vm.basis.join(' ')).toContain('not yet checked against a source');
  expect(vm.meta[0]).toEqual({ label: 'Method', value: 'Shake' });
  expect(templateVM(seed, seed.templateById.get('sidecar') as Template).parent).toEqual({
    id: 'daiquiri',
    name: 'Daiquiri',
  });
});

test('a template without usual ranges shows none and no unverified line', () => {
  const bare = { ...(seed.templateById.get('martini') as Template) };
  delete bare.usual;
  const vm = templateVM(seed, bare);
  expect(vm.ranges).toEqual([]);
  expect(vm.basis).toEqual([]);
});

test('a template of the user is tagged', () => {
  const model = fixtureModel();
  expect(templateRows(model, '').every((r) => !r.user)).toBe(true);
});

test('leaving a sheet keeps the filters set inside it', () => {
  const inSheet = parseHash('#/drinks?template=martini&sheet=filters');
  const below = parseHash('#/drinks');
  expect(closedSheet(inSheet, below)?.hash).toBe('#/drinks?template=martini');
  expect(closedSheet(below, inSheet)).toBeNull();
  expect(closedSheet(inSheet, parseHash('#/drinks/x'))).toBeNull();
  expect(closedSheet(inSheet, parseHash('#/drinks?sheet=filters'))).toBeNull();
});

test('a list is remembered by its destination and filters, not by a sheet', () => {
  expect(listKey(parseHash('#/drinks?q=a&sheet=filters'))).toBe(listKey(parseHash('#/drinks?q=a')));
  expect(listKey(parseHash('#/drinks/x?q=a'))).toBe(listKey(parseHash('#/drinks?q=a')));
  expect(listKey(parseHash('#/drinks?q=b'))).not.toBe(listKey(parseHash('#/drinks?q=a')));
  expect(listKey(parseHash('#/templates'))).not.toBe(listKey(parseHash('#/drinks')));
});
