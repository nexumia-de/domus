// Example dishes, hand-written: role slots filled by example components and by one raw ingredient.
// A role the dish does not fill is an open slot (the screens show it as an invitation).
import type { DishRecord } from '../records';

const version = (id: string) => ({ family: id, date: '2026-11-18' });
const g = (value: number) => ({ value, unit: 'g' as const });

export const DISHES: DishRecord[] = [
  {
    id: 'example-flat-dough-with-sauce',
    name: 'Example: Flat dough with pan sauce',
    portions: 4,
    course: 'main',
    slots: [
      {
        role: 'main',
        ref: { kind: 'component', id: 'example-soft-vegetable-base' },
        amount: g(100),
      },
      { role: 'starch', ref: { kind: 'component', id: 'example-flat-dough' }, amount: g(120) },
      { role: 'sauce', ref: { kind: 'component', id: 'example-pan-sauce' }, amount: g(80) },
      { role: 'garnish', ref: { kind: 'ingredient', id: 'parsley' }, amount: g(2) },
    ],
    version: version('example-flat-dough-with-sauce'),
    note: 'Example dish for the demonstration, not a recipe.',
  },
  {
    id: 'example-vegetable-plate',
    name: 'Example: Vegetable plate with herb oil',
    portions: 2,
    course: 'main',
    slots: [
      {
        role: 'main',
        ref: { kind: 'component', id: 'example-soft-vegetable-base' },
        amount: g(150),
      },
      { role: 'sauce', ref: { kind: 'component', id: 'example-pan-sauce' }, amount: g(60) },
      { role: 'acid', ref: { kind: 'ingredient', id: 'lemon-juice' }, amount: g(5) },
      { role: 'garnish', ref: { kind: 'component', id: 'example-herb-oil' }, amount: g(10) },
    ],
    version: version('example-vegetable-plate'),
    note: 'Example dish for the demonstration, not a recipe.',
  },
];
