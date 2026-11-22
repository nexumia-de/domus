import { describe, expect, test } from 'vitest';
import { inviteFromFragment, newSecret, type StoredSpace } from '@nexumia-de/hospes';
import {
  fragmentOf,
  inviteLink,
  inviteOf,
  needsAccess,
  parseInviteText,
} from '../src/logic/invite';

const TOKEN =
  'github_pat_11ABCDEFG0abcdefghijklmnop_QRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz01234567';
const space: StoredSpace = {
  id: 'a'.repeat(32),
  secret: newSecret(() => new Uint8Array(32).fill(7)),
  name: 'Zuhause',
  storage: { type: 'github', address: 'me/household', access: { token: TOKEN } },
};
const BASE = 'https://domus.nexumia.de/';

describe('the invite a space makes', () => {
  test('without the box ticked the token is nowhere in the link, decoded or not', () => {
    const link = inviteLink(BASE, space, false);
    expect(link.startsWith(`${BASE}#/join/`)).toBe(true);
    expect(link).not.toContain(TOKEN);
    const parsed = inviteFromFragment(link.slice(BASE.length));
    if (!parsed.ok) throw new Error('parse');
    expect(parsed.invite.access).toBeUndefined();
    expect(JSON.stringify(parsed.invite)).not.toContain('github_pat');
    // What is always there: the secret, the name and the storage address.
    expect(parsed.invite.secret).toBe(space.secret);
    expect(parsed.invite.name).toBe('Zuhause');
    expect(parsed.invite.storage).toEqual({ type: 'github', address: 'me/household' });
  });

  test('with the box ticked the token is in the invite, and only then', () => {
    const parsed = inviteFromFragment(inviteLink(BASE, space, true).slice(BASE.length));
    if (!parsed.ok) throw new Error('parse');
    expect(parsed.invite.access).toEqual({ token: TOKEN });
    expect(needsAccess(parsed.invite)).toBe(false);
  });

  test('a space without stored access has nothing to include', () => {
    const bare = { ...space, storage: { type: 'webdav', address: 'https://dav.example/x' } };
    expect(inviteOf(bare, true).access).toBeUndefined();
  });

  test('WebDAV access travels as user name and password', () => {
    const dav = {
      ...space,
      storage: {
        type: 'webdav',
        address: 'https://dav.example/x',
        access: { username: 'u', password: 'p' },
      },
    };
    expect(inviteOf(dav, true).access).toEqual({ username: 'u', password: 'p' });
    expect(inviteOf(dav, false).access).toBeUndefined();
  });

  test('a link already carrying a fragment is replaced, not extended', () => {
    const link = inviteLink(`${BASE}#/spaces/x`, space, false);
    expect(link.match(/#/g)).toHaveLength(1);
  });

  test('the link fits a QR code with and without the token', async () => {
    const { qrModules } = await import('../src/qr');
    for (const include of [false, true]) {
      const modules = qrModules(inviteLink(BASE, space, include));
      expect(modules.length).toBeGreaterThan(21);
    }
  });
});

describe('what a person pastes', () => {
  const link = inviteLink(BASE, space, true);
  test('a whole link, a bare fragment and a link with spaces around it all work', () => {
    expect(parseInviteText(link).ok).toBe(true);
    expect(parseInviteText(link.slice(BASE.length)).ok).toBe(true);
    expect(parseInviteText(`  ${link}\n`).ok).toBe(true);
    expect(parseInviteText(link.slice(BASE.length + 1)).ok).toBe(true);
    expect(fragmentOf(` ${link} `)).toBe(link.slice(BASE.length));
  });

  test('every way a link can be wrong has its own error', () => {
    const error = (text: string) => {
      const result = parseInviteText(text);
      return result.ok ? 'ok' : result.error;
    };
    expect(error('')).toBe('empty');
    expect(error('   ')).toBe('empty');
    expect(error('https://example.org/')).toBe('not-a-link');
    expect(error('#/spaces/new')).toBe('not-a-link');
    expect(error('#/join/@@@')).toBe('not-a-link');
    expect(error('#/join/AAAA')).toBe('not-json');
    const b64 = (value: unknown) =>
      `#/join/${btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
    expect(error(b64({ hello: 1 }))).toBe('not-an-invite');
    const good = { format: 'materia-invite', version: 2, secret: space.secret };
    expect(error(b64({ ...good, version: 1 }))).toBe('older-version');
    expect(error(b64({ ...good, version: 3 }))).toBe('newer-version');
    expect(error(b64({ ...good, storage: { type: 'github' } }))).toBe('invalid');
    expect(
      error(b64({ ...good, secret: 'short', storage: { type: 'github', address: 'a/b' } })),
    ).toBe('invalid');
    expect(error(b64({ ...good, storage: { type: 'dropbox', address: 'x' } }))).toBe(
      'unknown-storage',
    );
    expect(error(b64({ ...good, storage: { type: 'github', address: 'not a repo' } }))).toBe(
      'bad-address',
    );
    expect(
      error(b64({ ...good, storage: { type: 'webdav', address: 'http://dav.example/' } })),
    ).toBe('bad-address');
    expect(
      error(b64({ ...good, storage: { type: 'webdav', address: 'https://u:p@dav.example/' } })),
    ).toBe('bad-address');
  });

  test('a GitHub invite with an empty token still asks for one', () => {
    const parsed = parseInviteText(
      inviteLink(BASE, { ...space, storage: { ...space.storage, access: { token: '' } } }, true),
    );
    if (!parsed.ok) throw new Error('parse');
    expect(needsAccess(parsed.invite)).toBe(true);
  });
});
