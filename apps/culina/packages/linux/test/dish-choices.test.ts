// The choices and words of the filter's rows, on the web app's English texts. Proves the lists
// and the summary; does not prove the rows on screen (no GTK here).
import { expect, test } from 'vitest';
import { stringsEn as s, type DishEntry, type Offered } from '@culina/app/core';
import { choicesOf, entryLine, summaryOf, withChoice } from '../src/dish-choices';

const offered: Offered = {
  origins: ['shipped'],
  characters: ['creamy'],
  courses: ['soup', 'main'],
  cuisines: ['de', 'it'],
};

test('each list starts with "any", and a kept choice no longer offered stays to be dropped', () => {
  expect(choicesOf(offered, { cuisine: 'jp' }).cuisine).toEqual([undefined, 'de', 'it', 'jp']);
  expect(choicesOf(offered, {}).course).toEqual([undefined, 'soup', 'main']);
  expect(choicesOf(offered, { cuisine: 'de' }).cuisine).toEqual([undefined, 'de', 'it']);
});

test('a choice is set or dropped, the rest kept', () => {
  expect(withChoice({ course: 'soup' }, 'cuisine', 'it')).toEqual({
    course: 'soup',
    cuisine: 'it',
  });
  expect(withChoice({ course: 'soup', meatFree: true }, 'meatFree', undefined)).toEqual({
    course: 'soup',
  });
});

test('the summary names the choices, or says anything', () => {
  expect(summaryOf(s, 'en', {})).toBe(s.browse.characterAny);
  expect(summaryOf(s, 'en', { course: 'soup', cuisine: 'it', meatFree: true })).toBe(
    `${s.classics.course.soup} · ${s.classics.countries.it} · ${s.browse.meatFree}`,
  );
  // A word the app does not know is shown as it is.
  expect(summaryOf(s, 'en', { cuisine: 'jp' })).toBe('jp');
});

test('the line under a dish: course, cuisine, meat; what is not stated is left out', () => {
  const entry: DishEntry = {
    key: 'shipped:x',
    origin: 'shipped',
    id: 'x',
    name: 'X',
    href: '#/classic/x',
    course: 'main',
    cuisine: 'de',
    meatFree: false,
    characters: [],
    complete: true,
  };
  expect(entryLine(s, entry)).toBe(
    `${s.classics.course.main} · ${s.classics.countries.de} · ${s.classics.withMeat}`,
  );
  const bare: DishEntry = { ...entry };
  delete bare.course;
  delete bare.meatFree;
  expect(entryLine(s, bare)).toBe(s.classics.countries.de);
});
