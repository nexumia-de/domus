// The small pure parts: the categories with their names,
// the status in words, the router and the prefs.
import { describe, expect, test } from 'vitest';
import { categoriesOf, orderOf } from '../src/list/categories';
import { statusText } from '../src/list/status';
import { KEYS, applyTheme, langChoiceOf, langFor, prefsOn, themeOf } from '../src/prefs';
import { hashFor, parseHash } from '../src/router';
import { stringsEn } from '../src/strings';
import { stringsDe } from '../src/strings-de';

describe('categories', () => {
  test("starting names follow the language, own names and hiding are the household's", () => {
    const changes = [
      { id: 'c1', name: 'Garten' },
      { id: 'produce', name: 'Grünzeug' },
      { id: 'baby', hidden: true },
      { id: 'c2' },
    ];
    const all = categoriesOf(changes, 'de', 'Ohne Namen');
    expect(all[0]).toEqual({
      id: 'produce',
      name: 'Grünzeug',
      starting: true,
      hidden: false,
      renamed: true,
    });
    expect(all.find((c) => c.id === 'bakery')?.name).toBe('Brot & Backwaren');
    expect(categoriesOf(changes, 'en', 'Unnamed').find((c) => c.id === 'bakery')?.name).toBe(
      'Bread & bakery',
    );
    // Shown ones in the order of the list, `other` last of them, hidden ones after.
    const ids = all.map((c) => c.id);
    expect(ids.slice(-4)).toEqual(['c2', 'c1', 'other', 'baby']);
    expect(all.find((c) => c.id === 'c2')?.name).toBe('Ohne Namen');
    expect(orderOf(changes)).not.toContain('baby');
    expect(orderOf(changes).at(-1)).toBe('other');
  });
});

describe('the status in words', () => {
  const t = stringsEn.status;
  const at = '2026-11-20T09:00:00.000Z';
  const later = '2026-11-20T09:05:10.000Z';

  test('each kind', () => {
    expect(statusText(t, { kind: 'device-only' }, later, true)).toBe('On this device only');
    expect(statusText(t, { kind: 'in-step', at }, later, true)).toBe('Synced 5 min ago');
    expect(statusText(t, { kind: 'in-step', at }, at, true)).toBe('Synced just now');
    expect(statusText(t, { kind: 'in-step', at }, '2026-11-20T12:00:00Z', true)).toBe(
      'Synced 3 h ago',
    );
    expect(statusText(t, { kind: 'in-step', at }, '2026-11-25T12:00:00Z', true)).toBe(
      'Synced 2026-11-20',
    );
    expect(statusText(t, { kind: 'syncing' }, later, true)).toBe('Syncing …');
    expect(statusText(t, { kind: 'never' }, later, true)).toBe('Not synced yet');
    expect(statusText(t, { kind: 'never' }, later, false)).toBe('Offline');
    expect(statusText(t, undefined, later, true)).toBe('');
  });

  test('a failure names its reason, an unknown one too, and offline says offline', () => {
    expect(statusText(t, { kind: 'failed', failure: 'unauthorised' }, later, true)).toBe(
      'Last sync failed: the storage refused the access',
    );
    expect(statusText(t, { kind: 'failed', failure: 'bad-document' }, later, true)).toBe(
      'Last sync failed: the file in the storage could not be read',
    );
    expect(statusText(t, { kind: 'failed', failure: 'unreachable' }, later, false)).toBe('Offline');
    expect(statusText(stringsDe.status, { kind: 'device-only' }, later, true)).toBe(
      'Nur auf diesem Gerät',
    );
  });
});

describe('the router', () => {
  test('every route and its hash', () => {
    expect(parseHash('')).toEqual({ name: 'list' });
    expect(parseHash('#/')).toEqual({ name: 'list' });
    expect(parseHash(hashFor.categories)).toEqual({ name: 'categories' });
    expect(parseHash(hashFor.settings)).toEqual({ name: 'settings' });
    expect(parseHash(hashFor.entry('e-1/a b'))).toEqual({ name: 'entry', id: 'e-1/a b' });
    expect(parseHash('#/entry/')).toEqual({ name: 'list' });
    expect(parseHash('#/settings/more')).toEqual({ name: 'list' });
    expect(parseHash('#/unknown')).toEqual({ name: 'list' });
  });
});

describe('prefs', () => {
  test('a storage that throws or is missing reads nothing and says that nothing was kept', () => {
    const throwing = prefsOn({
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(throwing.get(KEYS.lang)).toBeNull();
    expect(throwing.set(KEYS.lang, 'de')).toBe(false);
    expect(prefsOn(null).get(KEYS.theme)).toBeNull();
    expect(prefsOn(null).set(KEYS.theme, 'dark')).toBe(false);
  });

  test('language and theme', () => {
    expect(themeOf('dark')).toBe('dark');
    expect(themeOf('neon')).toBe('system');
    expect(langChoiceOf(null)).toBe('device');
    expect(langFor('device', ['de-AT', 'en'])).toBe('de');
    expect(langFor('device', ['fr', 'de'])).toBe('en');
    expect(langFor('device', [])).toBe('en');
    expect(langFor('en', ['de'])).toBe('en');
    const calls: string[] = [];
    const root = {
      setAttribute: (n: string, v: string) => void calls.push(`${n}=${v}`),
      removeAttribute: (n: string) => void calls.push(`-${n}`),
    };
    applyTheme(root, 'dark');
    applyTheme(root, 'system');
    expect(calls).toEqual(['data-theme=dark', '-data-theme']);
  });

  test('German has every text English has', () => {
    const shape = (value: unknown): unknown =>
      value !== null && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]))
        : typeof value;
    expect(shape(stringsDe)).toEqual(shape(stringsEn));
  });
});
