import { describe, expect, test } from 'vitest';
import { FAILURES, problemOf } from '../src/logic/failures';
import { failureText } from '../src/logic/words';
import { stringsEn } from '../src/strings';
import { stringsDe } from '../src/strings-de';
import {
  BadClock,
  BadSecret,
  StoreBlocked,
  StoreOpenError,
  UnknownStorage,
} from '@nexumia-de/hospes';

const languages = { en: stringsEn, de: stringsDe };

describe.each(Object.entries(languages))('failures in %s', (_name, t) => {
  test('every failure has a sentence of its own, with no raw code alone', () => {
    for (const failure of FAILURES) {
      for (const type of [undefined, 'github', 'webdav']) {
        const text = failureText(t, { failure }, type);
        expect(text.length, `${failure} ${type}`).toBeGreaterThan(30);
        expect(text.endsWith('.'), `${failure} ${type}`).toBe(true);
        expect(text).not.toBe(failure);
      }
    }
  });

  test('the sentences of a kind of storage are for the failures that exist', () => {
    for (const set of [t.failures.github, t.failures.webdav]) {
      for (const [failure, text] of Object.entries(set)) {
        expect(FAILURES).toContain(failure);
        expect(text.length).toBeGreaterThan(30);
      }
    }
  });

  test('a rate limit says when to come back; a status code is added to a server error', () => {
    const until = failureText(
      t,
      { failure: 'server', detail: 'rate-limited until 2026-11-19T13:30:00.000Z' },
      'github',
      () => '14:30',
    );
    expect(until).toContain('14:30');
    expect(failureText(t, { failure: 'server', detail: 'rate-limited' }, 'github')).not.toContain(
      'HTTP',
    );
    expect(failureText(t, { failure: 'server', detail: 'HTTP 502' })).toContain('502');
    // Unknown details are not repeated: they could hold anything.
    expect(failureText(t, { failure: 'server', detail: 'secret-ish text' })).not.toContain(
      'secret-ish',
    );
  });

  test('every way an invite can be wrong has a sentence', () => {
    const errors = Object.keys(t.join.errors);
    expect(errors.sort()).toEqual(
      [
        'empty',
        'not-a-link',
        'not-json',
        'invalid',
        'not-an-invite',
        'older-version',
        'newer-version',
        'unknown-storage',
        'bad-address',
      ].sort(),
    );
    for (const text of Object.values(t.join.errors)) expect(text.length).toBeGreaterThan(20);
  });

  test('the common cases are told apart', () => {
    const texts = new Set(FAILURES.map((failure) => failureText(t, { failure }, 'github')));
    // Some failures share a sentence on purpose (the several ways a file can be unreadable
    // are different texts, the damaged-invite errors are not failures).
    expect(texts.size).toBeGreaterThanOrEqual(FAILURES.length - 1);
  });
});

test('German and English have the same keys and the same kinds of values', () => {
  const shape = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(shape)
      : value !== null && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]))
        : typeof value;
  expect(shape(stringsDe)).toEqual(shape(stringsEn));
});

test('German texts are not left in English', () => {
  const flat = (value: unknown, path = ''): [string, string][] =>
    typeof value === 'string'
      ? [[path, value]]
      : value !== null && typeof value === 'object'
        ? Object.entries(value).flatMap(([k, v]) => flat(v, `${path}.${k}`))
        : [];
  const en = new Map(flat(stringsEn));
  const same = flat(stringsDe).filter(([path, text]) => en.get(path) === text);
  // Names, codes and shared words that are the same in both languages.
  expect(same.map(([path]) => path).sort()).toEqual(
    [
      '.display.langDe',
      '.display.langEn',
      '.fields.tokenLabel',
      '.home.apps.0.href',
      '.home.apps.0.name',
      '.home.apps.1.href',
      '.home.apps.1.name',
      '.create.type.github.title',
      '.create.type.webdav.title',
      '.create.finish.nameLine',
      '.create.name.label',
      '.home.appsLabel',
      '.space.nameLabel',
    ].sort(),
  );
});

describe('what was thrown becomes a failure', () => {
  test('known errors, and nothing of the message is kept', () => {
    expect(problemOf(new StoreOpenError())).toEqual({ failure: 'store-unavailable' });
    expect(problemOf(new StoreBlocked())).toEqual({ failure: 'store-blocked' });
    expect(problemOf(new BadSecret())).toEqual({ failure: 'bad-secret' });
    expect(problemOf(new BadClock())).toEqual({ failure: 'bad-now' });
    expect(problemOf(new RangeError('token abc'))).toEqual({ failure: 'bad-storage' });
    expect(problemOf(new UnknownStorage('x'))).toEqual({ failure: 'bad-storage' });
    expect(problemOf(new Error('boom with a token'))).toEqual({ failure: 'unexpected' });
    expect(problemOf('text')).toEqual({ failure: 'unexpected' });
  });
});
