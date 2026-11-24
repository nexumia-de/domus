// The choices and words of the filter's rows and of Cook's group headings, on the web app's
// English texts. Proves the lists, the summary and the headings; does not prove the rows on screen
// (no GTK here).
import { expect, test } from 'vitest';
import { stringsEn as s, type DishEntry, type Offered, type RowGroup } from '@culina/app/core';
import {
  choicesOf,
  entryLine,
  groupTitle,
  rowLine,
  summaryOf,
  withChoice,
} from '../src/dish-choices';

const offered: Offered = {
  origins: ['shipped'],
  characters: ['creamy'],
  courses: ['soup', 'main'],
  cuisines: ['de', 'it'],
};

test('each list starts with "any", and a kept choice no longer offered stays to be dropped', () => {
  expect(choicesOf(offered, { cuisine: 'xx' }).cuisine).toEqual([undefined, 'de', 'it', 'xx']);
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
  expect(summaryOf(s, 'en', { cuisine: 'xx' })).toBe('xx');
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
  // In a course's group the row carries no course (groupRows takes it out) and the line drops it;
  // the control, a row with its course, keeps it.
  expect(rowLine(s, { entry, meta: { cuisine: 'de' } })).toBe(
    `${s.classics.countries.de} · ${s.classics.withMeat}`,
  );
  expect(rowLine(s, { entry, meta: { course: 'main', cuisine: 'de' } })).toBe(entryLine(s, entry));
});

test('a group of Cook is headed by its name and count, as on the web', () => {
  const group = (id: RowGroup['id'], n: number): RowGroup => ({
    id,
    rows: Array.from({ length: n }, () => ({ entry: {} as DishEntry, meta: {} })),
  });
  expect(groupTitle(s, group('main', 37))).toBe(`${s.classics.course.main} · 37 dishes`);
  expect(groupTitle(s, group('frames', 1))).toBe(`${s.browse.groupFrames} · 1 dish`);
  expect(groupTitle(s, group('none', 2))).toBe(`${s.browse.groupNoCourse} · 2 dishes`);
});
