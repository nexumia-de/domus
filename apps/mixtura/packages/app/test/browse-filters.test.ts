/* eslint-disable @typescript-eslint/no-non-null-assertion -- the fixtures are known; a missing entry should fail the test */
import { expect, test } from 'vitest';
import {
  activeFilters,
  applyFilters,
  chipsOf,
  filterParams,
  matchesSearch,
  parseFilters,
  type Filters,
} from '../src/screens/browse/filters';
import { familyOf, newestVersions } from '../src/screens/browse/model';
import { normalise } from '../src/screens/browse/normalise';
import { STRENGTH_BANDS, bandOf, inBand } from '../src/screens/browse/strength';
import { hashWith } from '../src/screens/drinks/url';
import { parseHash } from '../src/router';
import { fixtureModel, seedModel } from './browse-fixture';

const model = fixtureModel();
const names = (f: Filters): string[] => applyFilters(model, f).map((d) => d.spec.name);
const none: Filters = { q: '' };

test('the list shows the newest version of each lineage and hides retired drinks', () => {
  expect(names(none)).toEqual([
    'Crème Brûlée Flip',
    'Daiquiri',
    'Gimlet (less syrup)',
    'Gin and Soda',
    'Martini',
    'No Method Drink',
  ]);
  const pick = newestVersions([
    { spec: { lineageId: 'a', version: 1, status: 'draft' } },
    { spec: { lineageId: 'a', version: 3, status: 'draft' } },
    { spec: { lineageId: 'a', version: 2, status: 'draft' } },
  ] as never);
  expect(pick.map((p) => p.spec.version)).toEqual([3]);
});

test('text is compared without case and accents', () => {
  expect(normalise('  Crème  BRÛLÉE ')).toBe('creme brulee');
});

test('search finds a drink by name, case- and accent-insensitive', () => {
  expect(names({ q: 'DAIQ' })).toEqual(['Daiquiri']);
  expect(names({ q: 'brulee' })).toEqual(['Crème Brûlée Flip']);
  expect(names({ q: 'crème' })).toEqual(['Crème Brûlée Flip']);
});

test('search also reads ingredient names and tags', () => {
  expect(names({ q: 'vermouth' })).toEqual(['Martini']);
  expect(names({ q: 'london dry' })).toEqual(['Gimlet (less syrup)']);
  expect(names({ q: 'classic' })).toEqual(['Daiquiri']);
});

test('every word of a search must be found', () => {
  expect(names({ q: 'lime syrup' })).toEqual(['Daiquiri', 'Gimlet (less syrup)']);
  expect(names({ q: 'lime vermouth' })).toEqual([]);
  expect(matchesSearch(model.drinks[0]!, '   ')).toBe(true);
});

test('the template filter keeps the drinks that follow that template', () => {
  expect(names({ q: '', template: 'daiquiri' })).toEqual(['Daiquiri', 'Gimlet (less syrup)']);
  expect(names({ q: '', template: 'flip' })).toEqual([]);
});

test('the method filter', () => {
  expect(names({ q: '', method: 'stir' })).toEqual(['Martini']);
  expect(names({ q: '', method: 'shake' })).toEqual([
    'Crème Brûlée Flip',
    'Daiquiri',
    'Gimlet (less syrup)',
  ]);
});

test('the base filter follows the ingredient tree: a family contains its members', () => {
  expect(names({ q: '', base: 'gin' })).toEqual(['Gimlet (less syrup)', 'Gin and Soda', 'Martini']);
  expect(names({ q: '', base: 'london-gin' })).toEqual(['Gimlet (less syrup)']);
  expect(names({ q: '', base: 'rum' })).toEqual(['Daiquiri', 'No Method Drink']);
  expect(names({ q: '', base: 'spirits' }).length).toBe(6);
});

test('the base options are the families in use, most used first', () => {
  const options = model.baseOptions();
  expect(options.map((o) => `${o.id}:${o.count}`)).toEqual(['gin:3', 'rum:2', 'cognac:1']);
  expect(familyOf(model.tree, 'london-gin')).toBe('gin');
  expect(familyOf(model.tree, 'spirits')).toBe('spirits');
});

test('the strength filter uses the ABV after dilution and leaves out unknown ones', () => {
  const abv = Object.fromEntries(model.drinks.map((d) => [d.spec.name, model.abvOf(d.spec)]));
  expect(abv['Daiquiri']).toBeCloseTo(18.29, 1);
  expect(abv['No Method Drink']).toBeUndefined();
  expect(names({ q: '', strength: '14-22' })).toContain('Daiquiri');
  expect(names({ q: '', strength: '14-22' })).not.toContain('No Method Drink');
  const all = STRENGTH_BANDS.flatMap((b) => names({ q: '', strength: b.id }));
  expect(new Set(all).size).toBe(all.length);
  expect(all.length).toBe(model.drinks.length - model.withoutAbv());
  expect(model.withoutAbv()).toBe(1);
});

test('bands are ranges that meet without gaps or overlap', () => {
  for (let abv = 0; abv <= 80; abv += 0.5) {
    expect(STRENGTH_BANDS.filter((b) => inBand(b, abv))).toHaveLength(1);
  }
  expect(bandOf('nope')).toBeUndefined();
});

test('combined filters narrow the result', () => {
  const one = names({ q: '', template: 'daiquiri' });
  const two = names({ q: '', template: 'daiquiri', base: 'gin' });
  const three = names({ q: 'less', template: 'daiquiri', base: 'gin', method: 'shake' });
  expect(one.length).toBeGreaterThan(two.length);
  expect(two.length).toBeGreaterThan(0);
  expect(three).toEqual(['Gimlet (less syrup)']);
  expect(names({ q: 'martini', template: 'daiquiri' })).toEqual([]);
});

test('filters round-trip through the address', () => {
  const filters: Filters = { q: 'gin & tonic', template: 'martini', base: 'gin', strength: 'ge30' };
  const params = filterParams(filters);
  expect([...params.keys()]).toEqual(['q', 'template', 'base', 'strength']);
  expect(parseFilters(new URLSearchParams(params.toString()))).toEqual(filters);
  expect(parseFilters(new URLSearchParams(''))).toEqual({ q: '' });
  expect(activeFilters(filters)).toEqual(['template', 'base', 'strength']);
});

test('the route keeps other parameters and the sheet when filters change', () => {
  const route = parseHash('#/drinks/abc?q=x&template=daiquiri&swap=1&sheet=filters');
  expect(hashWith(route, { q: 'y' })).toBe('#/drinks/abc?swap=1&q=y&sheet=filters');
  expect(hashWith(route, { q: '' }, null)).toBe('#/drinks/abc?swap=1');
  expect(hashWith(parseHash('#/drinks'), { q: '', template: 'x' }, 'filters')).toBe(
    '#/drinks?template=x&sheet=filters',
  );
});

test('chips name the active filters, and an id the data lacks shows as it is', () => {
  const chips = chipsOf(
    model,
    { q: '', template: 'daiquiri', method: 'stir', base: 'gin', strength: 'lt14' },
    { template: (n) => `${n} template`, base: (n) => `Base: ${n}` },
  );
  expect(chips.map((c) => c.label)).toEqual([
    'Daiquiri template',
    'Stir',
    'Base: Gin',
    'Under 14 % ABV',
  ]);
  expect(
    chipsOf(model, { q: '', template: 'gone' }, { template: (n) => n, base: (n) => n })[0]?.label,
  ).toBe('gone');
});

test('the seed: counts, accent-free search and filters over 635 drinks', () => {
  const seed = seedModel();
  expect(seed.drinks).toHaveLength(635);
  expect(applyFilters(seed, { q: '', template: 'martini' })).toHaveLength(57);
  expect(applyFilters(seed, { q: 'aperol' }).length).toBeGreaterThan(0);
  expect(applyFilters(seed, { q: 'APEROL' })).toEqual(applyFilters(seed, { q: 'aperol' }));
  const gin = applyFilters(seed, { q: '', base: 'gin' });
  expect(gin.length).toBeGreaterThan(100);
  const both = applyFilters(seed, { q: '', base: 'gin', template: 'martini' });
  expect(both.length).toBeGreaterThan(0);
  expect(both.length).toBeLessThan(gin.length);
  expect(seed.withoutAbv()).toBe(36);
});
