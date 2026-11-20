// Joining by an invitation link, against the shared database in memory. The
// link is made with the host package's own code, as the Household app does.
import { expect, test } from 'vitest';
import { INVITE_FORMAT, INVITE_VERSION, type Invite } from '@nexumia-de/materia';
import { createMemoryStore, deriveSpace, inviteUrl, newSecret } from '@nexumia-de/hospes';
import { joinByLink } from '../src/join';

const invite = (extra: Partial<Invite> = {}): Invite => ({
  format: INVITE_FORMAT,
  version: INVITE_VERSION,
  secret: newSecret(),
  name: 'Household',
  storage: { type: 'github', address: 'me/household' },
  ...extra,
});
const link = (i: Invite): string => inviteUrl('https://domus.example/', i);

test('an invitation with access is joined as it is', async () => {
  const store = createMemoryStore();
  const i = invite({ access: { token: 'github_pat_x' } });
  const done = await joinByLink(store, `  ${link(i)} `);
  const { id } = await deriveSpace(i.secret);
  expect(done).toEqual({ ok: true, id, name: 'Household' });
  expect(await store.getSpace(id)).toEqual({
    id,
    secret: i.secret,
    name: 'Household',
    storage: { type: 'github', address: 'me/household', access: { token: 'github_pat_x' } },
  });
});

test('an invitation without access needs the token, and takes the one that is given', async () => {
  const store = createMemoryStore();
  const i = invite();
  expect(await joinByLink(store, link(i))).toEqual({ ok: false, error: 'needs-token' });
  expect(await store.listSpaces()).toEqual([]);
  const done = await joinByLink(store, link(i), ' github_pat_mine ');
  expect(done.ok).toBe(true);
  expect((await store.listSpaces())[0]?.storage.access).toEqual({ token: 'github_pat_mine' });
});

test('the part from the # on is enough, and a second join of the same space is refused', async () => {
  const store = createMemoryStore();
  const i = invite({ access: { token: 't' } });
  const fragment = link(i).slice(link(i).indexOf('#'));
  expect((await joinByLink(store, fragment)).ok).toBe(true);
  expect(await joinByLink(store, link(i))).toEqual({ ok: false, error: 'already-here' });
});

test('what is no invitation is said and stores nothing', async () => {
  const store = createMemoryStore();
  expect(await joinByLink(store, '  ')).toEqual({ ok: false, error: 'empty' });
  expect(await joinByLink(store, 'https://example.org/#/join/nonsense')).toEqual({
    ok: false,
    error: 'not-an-invitation',
  });
  expect(await joinByLink(store, 'milk and bread')).toEqual({
    ok: false,
    error: 'not-an-invitation',
  });
  expect(await store.listSpaces()).toEqual([]);
});
