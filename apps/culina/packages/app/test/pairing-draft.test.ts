// The ingredients of a dish being put together, as "Goes with" in the editor asks for them.
import { expect, test } from 'vitest';
import { draftLines } from '../src/pairing/draft';

const nameOf = (id: string): string => `name of ${id}`;
const ingredient = (id: string) => ({ ref: { kind: 'ingredient' as const, id } });
const component = (id: string) => ({ ref: { kind: 'component' as const, id } });

test('a slot filled by an ingredient is one line; an open slot gives none', () => {
  expect(draftLines([ingredient('a'), {}, ingredient('b')], [], nameOf)).toEqual([
    { ingredient: 'a', name: 'name of a' },
    { ingredient: 'b', name: 'name of b' },
  ]);
});

test('a component gives its ingredients, through the components it names, each once', () => {
  const components = [
    { id: 'sauce', lines: [ingredient('a'), component('stock'), ingredient('c')] },
    { id: 'stock', lines: [ingredient('b'), ingredient('a')] },
  ];
  expect(
    draftLines([component('sauce'), ingredient('c')], components, nameOf).map((l) => l.ingredient),
  ).toEqual(['a', 'b', 'c']);
});

test('a component that is gone gives nothing, and one that names itself ends', () => {
  const loop = [{ id: 'x', lines: [component('x'), ingredient('a')] }];
  expect(draftLines([component('gone')], [], nameOf)).toEqual([]);
  expect(draftLines([component('x')], loop, nameOf).map((l) => l.ingredient)).toEqual(['a']);
});
