// The place on the way back (src/shell/place.ts): which link takes the focus and which scroll shows
// it. Pure functions on numbers; the DOM, the history and the browser's scrolling are not here
// (e2e/list-place.mjs has them).
import { expect, test } from 'vitest';
import { entryOf, linkToFocus, PLACE_KEY, scrollFor, withEntry } from '../src/shell/place';

const band = { top: 60, bottom: 650 };

test('the link followed takes the focus again; nothing followed, no link', () => {
  const links = [
    { href: '#/classic/a', top: 900 },
    { href: '#/classic/b', top: 960 },
    { href: '#/classic/c', top: 1020 },
  ];
  expect(linkToFocus({ y: 700, link: { href: '#/classic/b', top: 960 } }, links)).toBe(1);
  // Moved (a row above it went away): the same href wherever it stands now.
  expect(linkToFocus({ y: 700, link: { href: '#/classic/c', top: 400 } }, links)).toBe(2);
  // The control: left by the navigation or a button, no link of the screen is chosen.
  expect(linkToFocus({ y: 700 }, links)).toBeUndefined();
  expect(linkToFocus({ y: 0, link: { href: '#/classic/b', top: 960 } }, [])).toBeUndefined();
});

test('the same link twice: the one nearest to where it stood', () => {
  const links = [
    { href: '#/cook', top: 100 },
    { href: '#/cook', top: 2000 },
  ];
  expect(linkToFocus({ y: 1800, link: { href: '#/cook', top: 1990 } }, links)).toBe(1);
});

test('the row gone (the list changed): the link that now stands nearest to its place', () => {
  const links = [
    { href: '#/classic/a', top: 300 },
    { href: '#/classic/d', top: 980 },
    { href: '#/classic/e', top: 1500 },
  ];
  expect(linkToFocus({ y: 700, link: { href: '#/classic/b', top: 960 } }, links)).toBe(1);
});

test('the scroll as it was while the link stays in the band; otherwise the link in the middle', () => {
  // The control: in view at the old scroll, the scroll is kept.
  expect(scrollFor(700, { top: 960, height: 60 }, band)).toBe(700);
  // The list got shorter above it: the link would stand below the bottom bar.
  expect(scrollFor(700, { top: 2000, height: 60 }, band)).toBe(2000 + 30 - 355);
  // Under the sticky header.
  expect(scrollFor(700, { top: 720, height: 60 }, band)).toBe(720 + 30 - 355);
  // No link: the scroll as it was, never negative.
  expect(scrollFor(700, undefined, band)).toBe(700);
  expect(scrollFor(100, { top: 10, height: 40 }, band)).toBe(0);
});

test("the history entry's id is added beside what its state holds", () => {
  expect(entryOf(null)).toBeUndefined();
  expect(entryOf({ fromList: 'cook' })).toBeUndefined();
  const state = withEntry({ fromList: 'cook' }, 'x1');
  expect(state).toEqual({ fromList: 'cook', [PLACE_KEY]: 'x1' });
  expect(entryOf(state)).toBe('x1');
  expect(entryOf(withEntry(null, 'x2'))).toBe('x2');
  expect(entryOf({ [PLACE_KEY]: 3 })).toBeUndefined();
});
