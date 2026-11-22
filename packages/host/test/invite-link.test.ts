import { type Invite } from '@nexumia-de/materia';
import { expect, test } from 'vitest';
import { bytesToBase64Url } from '../src/base64url';
import { inviteFromFragment, inviteToFragment, inviteUrl } from '../src/invite-link';
import { newSecret } from '../src/space';

const base: Invite = {
  format: 'materia-invite',
  version: 2,
  secret: newSecret(),
  storage: { type: 'github', address: 'owner/repo' },
};

test.each<[string, Invite]>([
  ['minimal', base],
  ['with name (non-ASCII)', { ...base, name: 'Zuhause – Küche ☕' }],
  ['with access', { ...base, access: { token: 'ghp_x/+=', user: 'ä' } }],
  ['with both', { ...base, name: 'Haus', access: { token: 't' } }],
])('round trip: %s', (_n, invite) => {
  const fragment = inviteToFragment(invite);
  expect(fragment).toMatch(/^#\/join\/[A-Za-z0-9_-]+$/);
  expect(inviteFromFragment(fragment)).toEqual({ ok: true, invite });
  expect(inviteFromFragment(fragment.slice(1))).toEqual({ ok: true, invite });
});

test('inviteUrl puts the fragment under a base and replaces an old one', () => {
  const url = inviteUrl('https://domus.nexumia.de/', base);
  expect(url.startsWith('https://domus.nexumia.de/#/join/')).toBe(true);
  expect(inviteUrl('https://x.example/app/#/old', base)).toBe(
    'https://x.example/app/' + inviteToFragment(base),
  );
  expect(inviteFromFragment(new URL(url).hash)).toEqual({ ok: true, invite: base });
});

test('garbage', () => {
  expect(inviteFromFragment('')).toEqual({ ok: false, error: 'not-a-link' });
  expect(inviteFromFragment('#/other/abc')).toEqual({ ok: false, error: 'not-a-link' });
  expect(inviteFromFragment('#/join/@@@@')).toEqual({ ok: false, error: 'not-a-link' });
  expect(inviteFromFragment('#/join/a')).toEqual({ ok: false, error: 'not-a-link' });
  const enc = (s: string): string => '#/join/' + bytesToBase64Url(new TextEncoder().encode(s));
  expect(inviteFromFragment(enc('not json'))).toEqual({ ok: false, error: 'not-json' });
  expect(inviteFromFragment('#/join/' + bytesToBase64Url(new Uint8Array([0xff, 0xfe])))).toEqual({
    ok: false,
    error: 'not-json',
  });
  expect(inviteFromFragment(enc('{"a":1}'))).toEqual({ ok: false, error: 'not-an-invite' });
  expect(inviteFromFragment(enc(JSON.stringify({ ...base, secret: 'short' })))).toEqual({
    ok: false,
    error: 'invalid',
  });
});

test('an older or newer invite version', () => {
  const enc = (v: number): string =>
    '#/join/' + bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ ...base, version: v })));
  expect(inviteFromFragment(enc(1))).toEqual({ ok: false, error: 'older-version' });
  expect(inviteFromFragment(enc(3))).toEqual({ ok: false, error: 'newer-version' });
});
