// The place on the way back (src/shell/place.ts): which link takes the focus and which scroll shows
// it. Pure functions on numbers; the DOM, the history and the browser's scrolling are not here
// (e2e/list-place.mjs has them).
import { expect, test } from 'vitest';
import {
  bandOf,
  entryOf,
  linkToFocus,
  PLACE_KEY,
  restoreTarget,
  scrollFor,
  withEntry,
} from '../src/shell/place';

const band = { top: 60, bottom: 650 };

test('the link followed takes the focus again; nothing followed, no link', () => {
  const links = [
    { href: '#/classic/a', top: 900 },
    { href: '#/classic/b', top: 960 },
    { href: '#/classic/c', top: 1020 },
  ];
  expect(
    linkToFocus({ y: 700, followed: true, link: { href: '#/classic/b', top: 960 } }, links),
  ).toBe(1);
  // Moved (a row above it went away): the same href wherever it stands now.
  expect(
    linkToFocus({ y: 700, followed: true, link: { href: '#/classic/c', top: 400 } }, links),
  ).toBe(2);
  // The control: left by the navigation or a button, no link of the screen is chosen.
  expect(linkToFocus({ y: 700, followed: false }, links)).toBeUndefined();
  expect(
    linkToFocus({ y: 0, followed: true, link: { href: '#/classic/b', top: 960 } }, []),
  ).toBeUndefined();
});

test('the same link twice: the one nearest to where it stood', () => {
  const links = [
    { href: '#/cook', top: 100 },
    { href: '#/cook', top: 2000 },
  ];
  expect(linkToFocus({ y: 1800, followed: true, link: { href: '#/cook', top: 1990 } }, links)).toBe(
    1,
  );
});

test('the row gone (the list changed): the link that now stands nearest to its place', () => {
  const links = [
    { href: '#/classic/a', top: 300 },
    { href: '#/classic/d', top: 980 },
    { href: '#/classic/e', top: 1500 },
  ];
  expect(
    linkToFocus({ y: 700, followed: true, link: { href: '#/classic/b', top: 960 } }, links),
  ).toBe(1);
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

test('the band: header and bottom bar over main at 360 px; nothing over main from 720 px', () => {
  const phoneMain = { top: 56, bottom: 9000, left: 0, right: 360 };
  expect(
    bandOf(
      phoneMain,
      { top: 0, bottom: 56, left: 0, right: 360 },
      { top: 656, bottom: 720, left: 0, right: 360 },
      720,
    ),
  ).toEqual({ top: 56, bottom: 656 });
  // From 720 px the header and the rail are a column beside main.
  const wideMain = { top: 0, bottom: 9000, left: 240, right: 1000 };
  expect(
    bandOf(
      wideMain,
      { top: 0, bottom: 56, left: 0, right: 240 },
      { top: 56, bottom: 800, left: 0, right: 240 },
      800,
    ),
  ).toEqual({ top: 0, bottom: 800 });
});

const rows = Array.from({ length: 100 }, (_, i) => ({
  href: `#/classic/r${i}`,
  top: 200 + i * 80,
  height: 80,
}));
const heading = { top: 80, height: 40 };

test('left by a link: that link focused, the scroll as it was while it is in the band', () => {
  const place = { y: 3000, followed: true, link: { href: '#/classic/r40', top: 3400 } };
  expect(restoreTarget(place, rows, heading, band, 20000)).toEqual({ y: 3000, focus: 40 });
});

test('left another way (back, forward, the navigation): the scroll as it was, the focus in view', () => {
  // A link followed earlier and still in view at the old scroll takes the focus.
  const earlier = { y: 3000, followed: false, link: { href: '#/classic/r40', top: 3400 } };
  expect(restoreTarget(earlier, rows, heading, band, 20000)).toEqual({ y: 3000, focus: 40 });
  // Not in view (the user scrolled on, then used the navigation): never scrolled to; the first
  // link in the band takes the focus, not the heading 3000 px above.
  const scrolled = { y: 5000, followed: false, link: { href: '#/classic/r40', top: 3400 } };
  const got = restoreTarget(scrolled, rows, heading, band, 20000);
  expect(got.y).toBe(5000);
  expect(got.focus).toBe(rows.findIndex((r) => r.top - 5000 >= 60));
  // At the top the heading is in view: it takes the focus, as on the way forward (the control).
  expect(restoreTarget({ y: 0, followed: false }, rows, heading, band, 20000)).toEqual({
    y: 0,
    focus: 'heading',
  });
  // No link in view and no heading: the heading, the page not moved.
  expect(restoreTarget({ y: 5000, followed: false }, [], heading, band, 20000)).toEqual({
    y: 5000,
    focus: 'heading',
  });
  // A page that got shorter: the scroll at its end.
  expect(restoreTarget({ y: 5000, followed: false }, [], heading, band, 1200).y).toBe(1200);
});

test('a button or summary stands in only where no link is', () => {
  const mixed = [
    { href: '', top: 950, height: 44 },
    { href: '#/classic/d', top: 1200, height: 80 },
    { href: '', top: 990, height: 44 },
  ];
  // The row gone: the nearest link, not the nearer button.
  expect(
    linkToFocus({ y: 700, followed: true, link: { href: '#/classic/b', top: 960 } }, mixed),
  ).toBe(1);
  // Left another way, a link and a button in view: the link.
  expect(restoreTarget({ y: 700, followed: false }, mixed, heading, band, 20000).focus).toBe(1);
  // Only buttons in view: the first of them, not the heading far above.
  const buttons = [{ href: '', top: 950, height: 44 }];
  expect(restoreTarget({ y: 700, followed: false }, buttons, heading, band, 20000).focus).toBe(0);
});
