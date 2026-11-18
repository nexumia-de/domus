// Example components, hand-written. Not recipes: the lines and the weighed outputs are made-up
// round numbers that exercise the screens (nesting three levels deep, percent lines with a base,
// a component with no output weight, lines without an amount).
import type { ComponentRecord } from '../records';

const YIELD_SOURCE = 'Example data, not a weighed output';
const version = (id: string) => ({ family: id, date: '2026-11-18' });
const g = (value: number) => ({ value, unit: 'g' as const });
const ingredient = (id: string) => ({ kind: 'ingredient' as const, id });
const component = (id: string) => ({ kind: 'component' as const, id });

export const COMPONENTS: ComponentRecord[] = [
  {
    id: 'example-soft-vegetable-base',
    name: 'Example: Soft vegetable base',
    lines: [
      { ref: ingredient('onion'), amount: g(200), state: 'raw' },
      { ref: ingredient('carrot'), amount: g(100), state: 'raw' },
      { ref: ingredient('celery'), amount: g(100), state: 'raw' },
      { ref: ingredient('butter'), amount: g(50) },
    ],
    yield: { amount: g(360), source: YIELD_SOURCE },
    version: version('example-soft-vegetable-base'),
  },
  {
    id: 'example-vegetable-stock',
    name: 'Example: Vegetable stock',
    lines: [
      { ref: component('example-soft-vegetable-base'), amount: g(200) },
      { ref: ingredient('water'), amount: g(1000) },
      { ref: ingredient('salt'), amount: g(5) },
    ],
    yield: { amount: g(1000), source: YIELD_SOURCE },
    version: version('example-vegetable-stock'),
  },
  {
    id: 'example-pan-sauce',
    name: 'Example: Pan sauce with a stock base',
    role: 'sauce',
    lines: [
      { ref: component('example-vegetable-stock'), amount: g(300) },
      { ref: ingredient('butter'), amount: g(40) },
      { ref: ingredient('flour'), amount: g(30) },
      { ref: ingredient('tomato-pepper-puree'), amount: g(100) },
      { ref: ingredient('salt') },
    ],
    yield: { amount: g(400), source: YIELD_SOURCE },
    version: version('example-pan-sauce'),
  },
  {
    id: 'example-flat-dough',
    name: 'Example: Flat dough',
    role: 'starch',
    percentBase: 'flour',
    lines: [
      { ref: ingredient('flour'), amount: g(500), role: 'flour' },
      { ref: ingredient('water'), amount: { value: 60, unit: 'percent' }, role: 'water' },
      { ref: ingredient('salt'), amount: { value: 2, unit: 'percent' } },
      { ref: ingredient('yeast'), amount: { value: 1, unit: 'percent' } },
    ],
    yield: { amount: g(800), source: YIELD_SOURCE },
    version: version('example-flat-dough'),
  },
  {
    id: 'example-herb-oil',
    name: 'Example: Herb oil',
    role: 'garnish',
    lines: [
      { ref: ingredient('oil'), amount: g(100) },
      { ref: ingredient('parsley'), amount: g(20) },
      { ref: ingredient('salt') },
    ],
    version: version('example-herb-oil'),
  },
];
