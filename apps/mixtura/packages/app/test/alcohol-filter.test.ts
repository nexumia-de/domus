// The alcohol filters of the drinks list agree with the engine's class on every seed
// drink, for every preset; unknown drinks are counted and explained, not hidden.
import {
  ALCOHOL_PRESETS,
  alcoholThresholds,
  classifyAlcohol,
  computeBalance,
} from '@mixtura/engine';
import { expect, test } from 'vitest';
import {
  alcoholOf,
  tallyAlcohol,
  thresholdsFor,
  unknownGroups,
} from '../src/screens/browse/alcohol';
import {
  applyFilters,
  chipsOf,
  filterParams,
  parseFilters,
  type Filters,
} from '../src/screens/browse/filters';
import { parseHash } from '../src/router';
import { hashWith } from '../src/screens/drinks/url';
import { strings } from '../src/strings';
import { seedModel } from './browse-fixture';

const model = seedModel();
const presets = ALCOHOL_PRESETS.without.flatMap((w) =>
  ALCOHOL_PRESETS.low.map((l) => [w.id, l.id] as const),
);

test('the filter result is the engine class on all seed drinks, under every preset pair', () => {
  for (const [w, l] of presets) {
    const t = alcoholThresholds(w, l);
    for (const cls of ['none', 'low'] as const) {
      const hits = applyFilters(model, { q: '', alcohol: cls }, model.drinks, undefined, t);
      const expected = model.drinks.filter((d) => {
        const b = computeBalance(model.tree, { method: d.spec.method, lines: d.spec.lines });
        return b.ok && classifyAlcohol(b.value, model.tree, t).class === cls;
      });
      expect(
        hits.map((d) => d.spec.id),
        `${w} ${l} ${cls}`,
      ).toEqual(expected.map((d) => d.spec.id));
    }
  }
});

test('seed counts: the default lines, the 15 % line and the strict lines', () => {
  const count = (w: string, l: string) => tallyAlcohol(model, model.drinks, thresholdsFor(w, l));
  expect(count('below-0.5', 'up-to-10')).toMatchObject({ none: 12, low: 73, unknown: 38 });
  expect(count('up-to-0.05', 'up-to-1.2')).toMatchObject({ none: 12, low: 2, unknown: 38 });
  const wide = count('below-0.5', 'up-to-15');
  expect(wide).toMatchObject({ none: 12, low: 180, standard: 409, unknown: 38 });
  expect(wide.none + wide.low + wide.standard + wide.unknown).toBe(model.drinks.length);
});

test('a raised low line only moves drinks from standard to low', () => {
  const a = tallyAlcohol(model, model.drinks, thresholdsFor('below-0.5', 'up-to-10'));
  const b = tallyAlcohol(model, model.drinks, thresholdsFor('below-0.5', 'up-to-15'));
  expect(b.none).toBe(a.none);
  expect(b.unknown).toBe(a.unknown);
  expect(b.low - a.low).toBe(a.standard - b.standard);
});

test('unknown drinks are grouped by reason with the ingredients named', () => {
  const t = thresholdsFor('below-0.5', 'up-to-10');
  const groups = unknownGroups(model, model.drinks, t);
  expect(groups.reduce((n, g) => n + g.drinks.length, 0)).toBe(38);
  expect(groups.map((g) => [g.reason, g.drinks.length])).toEqual([
    ['no-dilution', 19],
    ['unknown-abv', 17],
    ['excluded-line', 2],
  ]);
  const abv = groups.find((g) => g.reason === 'unknown-abv');
  expect(abv?.drinks.every((d) => d.ingredients.length > 0)).toBe(true);
  for (const g of groups) expect(strings.browse.alcohol.reasons[String(g.reason)]).toBeTruthy();
});

test('an unknown drink is in neither filter', () => {
  const t = thresholdsFor('below-0.5', 'up-to-10');
  const unknown = model.drinks.filter((d) => alcoholOf(model, d, t).class === 'unknown');
  const none = new Set(applyFilters(model, { q: '', alcohol: 'none' }, model.drinks, undefined, t));
  const low = new Set(applyFilters(model, { q: '', alcohol: 'low' }, model.drinks, undefined, t));
  for (const d of unknown) expect(none.has(d) || low.has(d)).toBe(false);
  expect(unknown.length).toBe(38);
});

test('the filter combines with the other filters and with search', () => {
  const t = thresholdsFor('below-0.5', 'up-to-10');
  const all = applyFilters(model, { q: '', alcohol: 'none' }, model.drinks, undefined, t);
  const shaken = applyFilters(
    model,
    { q: '', alcohol: 'none', method: 'shake' },
    model.drinks,
    undefined,
    t,
  );
  expect(shaken.length).toBeLessThan(all.length);
  expect(shaken.every((d) => d.spec.method === 'shake')).toBe(true);
  const found = applyFilters(model, { q: 'shirley', alcohol: 'none' }, model.drinks, undefined, t);
  expect(found.map((d) => d.spec.name)).toEqual(['Shirley Temple']);
});

test('the filter lives in the address and survives a round trip; an unknown value shows nothing', () => {
  const filters: Filters = { q: '', alcohol: 'low', method: 'stir' };
  const hash = hashWith(parseHash('#/drinks'), filters);
  expect(hash).toBe('#/drinks?alcohol=low&method=stir');
  expect(parseFilters(filterParams(filters))).toEqual(filters);
  expect(applyFilters(model, { q: '', alcohol: 'bogus' })).toEqual([]);
});

test('chips and labels say "calculated", never "alcohol-free"', () => {
  const chips = chipsOf(
    model,
    { q: '', alcohol: 'none' },
    {
      template: (n) => n,
      makeable: (v) => v,
      alcohol: (v) => strings.browse.alcohol.classWords[v] ?? v,
      base: (n) => n,
    },
  );
  expect(chips[0]?.label).toBe('Without alcohol (calculated)');
  expect(JSON.stringify(strings.browse.alcohol)).not.toMatch(/alcohol[- ]free|non-alcoholic/i);
});
