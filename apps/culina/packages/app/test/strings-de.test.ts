// The German set has exactly the keys of the English one, and every function takes the same
// arguments and uses the same ones (the placeholders).
import { expect, test } from 'vitest';
import { stringsDe, stringsEn } from '../src/strings';
import { FORBIDDEN_DE } from './wording';

type Leaf = string | ((...args: never[]) => string);

const walk = (value: unknown, path: string, out: Map<string, Leaf>): Map<string, Leaf> => {
  if (typeof value === 'string' || typeof value === 'function') out.set(path, value as Leaf);
  else if (typeof value === 'object' && value !== null)
    for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`, out);
  return out;
};

const en = walk(stringsEn, 'strings', new Map());
const de = walk(stringsDe, 'strings', new Map());

/** Numbers that stand for the arguments; each is found in the text when the argument is used. */
const MARKS = [7001, 7002, 7003, 7004];

const call = (fn: Leaf, args: unknown[]): string => {
  if (typeof fn === 'string') return fn;
  try {
    return (fn as (...a: unknown[]) => string)(...args);
  } catch {
    // The one function that reads a date.
    return (fn as (...a: unknown[]) => string)('2026-11-18');
  }
};

/** The marks a text uses, in order. */
const used = (text: string): number[] => MARKS.filter((m) => text.includes(String(m)));

test('both sets have the same keys', () => {
  expect([...de.keys()].sort()).toEqual([...en.keys()].sort());
  expect(en.size).toBeGreaterThan(400);
});

test('every key is a text in both sets, or a function in both', () => {
  for (const [path, value] of en) expect(typeof de.get(path), path).toBe(typeof value);
});

test('every function takes the same number of arguments', () => {
  for (const [path, value] of en) {
    const other = de.get(path);
    if (typeof value === 'function' && typeof other === 'function')
      expect(other.length, path).toBe(value.length);
  }
});

test('every function uses the same arguments in both sets', () => {
  for (const [path, value] of en) {
    const other = de.get(path);
    if (typeof value !== 'function' || typeof other !== 'function') continue;
    const args = MARKS.slice(0, value.length);
    expect(used(call(other, args)), path).toEqual(used(call(value, args)));
    // Singular and special cases: the first argument is 1, 0 or below zero.
    for (const first of [1, 0, -1]) {
      const rest = [first, ...MARKS.slice(1, value.length)];
      expect(call(other, rest).length, `${path}(${first})`).toBeGreaterThan(0);
      expect(call(value, rest).length, `${path}(${first})`).toBeGreaterThan(0);
    }
  }
});

test('no German text is empty, untrimmed, or judges a dish', () => {
  for (const [path, value] of de) {
    const text = call(value, MARKS);
    expect(text, path).toBe(text.trim());
    expect(text.length, path).toBeGreaterThan(0);
    expect(text.match(FORBIDDEN_DE), path).toBeNull();
  }
});

test('a German text differs from the English one unless it is the same word in both', () => {
  const same = [...en].filter(
    ([path, value]) => typeof value === 'string' && value === de.get(path),
  );
  // Names that are the same in both languages: the app name, Start, Version, Import, Snack ...
  expect(same.length).toBeLessThan(40);
});
