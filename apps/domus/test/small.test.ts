import { describe, expect, test } from 'vitest';
import type { FindRepositoriesResult } from '@nexumia-de/hospes';
import { chooseRepository, verdictOf } from '../src/logic/github-setup';
import { cleanName } from '../src/logic/names';
import { ago, clearFailure, lastFailure, noteFailure, spaceState } from '../src/logic/status';
import { parseWebdavAddress, storageWords, validAddress } from '../src/logic/storage';
import {
  LANG_KEY,
  THEME_KEY,
  parseLangChoice,
  parseTheme,
  readLangChoice,
  readTheme,
  resolveLang,
  writeLangChoice,
  writeTheme,
} from '../src/prefs';
import { hashFor, parseHash } from '../src/router';
import { stringsEn } from '../src/strings';

const ID = 'ab'.repeat(16);

describe('router', () => {
  test('every route and its hash', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/nowhere')).toEqual({ name: 'home' });
    expect(parseHash('#/spaces/new')).toEqual({ name: 'new' });
    expect(parseHash(hashFor.space(ID))).toEqual({ name: 'space', id: ID });
    expect(parseHash(hashFor.invite(ID))).toEqual({ name: 'invite', id: ID });
    expect(parseHash(hashFor.access(ID))).toEqual({ name: 'access', id: ID });
    expect(parseHash('#/spaces/not-an-id')).toEqual({ name: 'home' });
    expect(parseHash(`#/spaces/${ID}/other`)).toEqual({ name: 'home' });
  });
  test('join keeps the whole fragment for the invite parser', () => {
    expect(parseHash('#/join/abc_-DEF')).toEqual({ name: 'join', fragment: '#/join/abc_-DEF' });
    expect(parseHash('#/join')).toEqual({ name: 'join', fragment: '' });
    expect(parseHash('#/join/')).toEqual({ name: 'join', fragment: '' });
  });
});

describe('github steps', () => {
  const repo = (fullName: string, canWrite = true, isPrivate = true) => ({
    fullName,
    canWrite,
    private: isPrivate,
  });
  const found = (repositories: ReturnType<typeof repo>[]): FindRepositoriesResult => ({
    ok: true,
    repositories,
    more: false,
  });
  test('exactly one writable repository is used', () => {
    expect(chooseRepository(found([repo('me/a'), repo('me/b', false)]))).toEqual({
      kind: 'use',
      repository: 'me/a',
    });
  });
  test('several writable ones are picked from, the read-only ones are not offered', () => {
    const choice = chooseRepository(found([repo('me/a'), repo('me/b'), repo('me/c', false)]));
    expect(choice.kind).toBe('pick');
    if (choice.kind === 'pick')
      expect(choice.repositories.map((r) => r.fullName)).toEqual(['me/a', 'me/b']);
  });
  test('none, none writable, and failures', () => {
    expect(chooseRepository(found([]))).toEqual({ kind: 'none' });
    expect(chooseRepository(found([repo('me/a', false)]))).toEqual({ kind: 'none-writable' });
    expect(chooseRepository({ ok: false, failure: 'unauthorised' })).toEqual({
      kind: 'failed',
      problem: { failure: 'unauthorised' },
    });
    expect(chooseRepository({ ok: false, failure: 'server', detail: 'HTTP 500' })).toEqual({
      kind: 'failed',
      problem: { failure: 'server', detail: 'HTTP 500' },
    });
  });
  test('the verdict: ok, public warns, read-only blocks, failures say why', () => {
    const reachable = (isPrivate: boolean, canWrite: boolean) =>
      verdictOf({ state: 'reachable', private: isPrivate, canWrite, empty: false });
    expect(reachable(true, true)).toEqual({ kind: 'ok' });
    expect(reachable(false, true)).toEqual({ kind: 'public' });
    expect(reachable(true, false)).toEqual({ kind: 'readonly' });
    expect(reachable(false, false)).toEqual({ kind: 'readonly' });
    expect(verdictOf({ state: 'not-found' })).toEqual({
      kind: 'failed',
      problem: { failure: 'not-found' },
    });
  });
});

describe('storage in words', () => {
  test('GitHub and WebDAV, never a user name, password or token', () => {
    expect(storageWords({ type: 'github', address: 'me/household' })).toBe('GitHub: me/household');
    expect(storageWords({ type: 'webdav', address: 'https://dav.example/remote.php/x/' })).toBe(
      'WebDAV: dav.example/remote.php/x',
    );
    expect(storageWords({ type: 'webdav', address: 'https://dav.example/' })).toBe(
      'WebDAV: dav.example',
    );
    expect(storageWords({ type: 'webdav', address: 'https://u:p@dav.example/x' })).not.toContain(
      'u:p',
    );
    expect(storageWords({ type: 'other', address: 'x' })).toBe('other');
  });
  test('addresses', () => {
    expect(validAddress('github', 'me/household')).toBe(true);
    expect(validAddress('github', 'me/../x')).toBe(false);
    expect(validAddress('github', 'me')).toBe(false);
    expect(validAddress('webdav', 'https://dav.example/x')).toBe(true);
    expect(validAddress('webdav', 'http://dav.example/x')).toBe(false);
    expect(parseWebdavAddress('https://u@dav.example/')).toBeUndefined();
    expect(validAddress('s3', 'x')).toBe(false);
  });
  test('names', () => {
    expect(cleanName('  Home   sweet  home ')).toBe('Home sweet home');
    expect(cleanName('')).toBeUndefined();
    expect(cleanName('x'.repeat(60))).toHaveLength(60);
    expect(cleanName('x'.repeat(61))).toBeUndefined();
  });
});

describe('the state of the last cycle', () => {
  const failure = { failure: 'blocked' as const };
  test('never, in step, failed', () => {
    expect(spaceState(undefined, undefined)).toEqual({ kind: 'never' });
    expect(spaceState('2026-11-19T12:00:00.000Z', undefined)).toEqual({
      kind: 'in-step',
      at: '2026-11-19T12:00:00.000Z',
    });
    expect(spaceState(undefined, { at: '2026-11-19T12:00:00.000Z', problem: failure }).kind).toBe(
      'failed',
    );
  });
  test('a failure newer than the last good cycle wins, an older one does not', () => {
    const good = '2026-11-19T12:00:00.000Z';
    expect(spaceState(good, { at: '2026-11-19T12:05:00.000Z', problem: failure }).kind).toBe(
      'failed',
    );
    expect(spaceState(good, { at: '2026-11-19T11:55:00.000Z', problem: failure }).kind).toBe(
      'in-step',
    );
  });
  test('failures are remembered per space and cleared', () => {
    noteFailure('x', 't', failure);
    expect(lastFailure('x')?.problem).toEqual(failure);
    clearFailure('x');
    expect(lastFailure('x')).toBeUndefined();
  });
  test('ago', () => {
    const now = '2026-11-19T12:00:00.000Z';
    expect(ago(stringsEn, now, now)).toBe('just now');
    expect(ago(stringsEn, '2026-11-19T11:55:00.000Z', now)).toBe('5 min ago');
    expect(ago(stringsEn, '2026-11-19T09:00:00.000Z', now)).toBe('3 h ago');
    expect(ago(stringsEn, '2026-11-17T09:00:00.000Z', now)).toBe('2026-11-17');
  });
});

describe('language and theme', () => {
  test('the device decides unless chosen', () => {
    expect(resolveLang('device', ['de-AT', 'en'])).toBe('de');
    expect(resolveLang('device', ['en-US', 'de'])).toBe('en');
    expect(resolveLang('device', [])).toBe('en');
    expect(resolveLang('de', ['en'])).toBe('de');
    expect(resolveLang('en', ['de'])).toBe('en');
  });
  test('storage that is missing or throws is no problem', () => {
    expect(readLangChoice(null)).toBe('device');
    expect(writeLangChoice(null, 'de')).toBe(false);
    const broken = {
      getItem: () => {
        throw new Error('no');
      },
      setItem: () => {
        throw new Error('no');
      },
    };
    expect(readTheme(broken)).toBe('system');
    expect(writeTheme(broken, 'dark')).toBe(false);
    const memory = new Map<string, string>();
    const store = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
    };
    expect(writeLangChoice(store, 'de')).toBe(true);
    expect(memory.get(LANG_KEY)).toBe('de');
    expect(readLangChoice(store)).toBe('de');
    expect(writeTheme(store, 'dark')).toBe(true);
    expect(memory.get(THEME_KEY)).toBe('dark');
    expect(parseTheme('x')).toBe('system');
    expect(parseLangChoice('x')).toBe('device');
    // The only keys: no secret, token or space is ever kept here.
    expect([...memory.keys()].sort()).toEqual([LANG_KEY, THEME_KEY]);
  });
});
