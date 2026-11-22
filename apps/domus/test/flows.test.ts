import { expect, test } from 'vitest';
import { ensureSpace, isDeviceOnly, localChange } from '@nexumia-de/hospes';
import {
  changeAccess,
  connectStorage,
  createSpace,
  joinSpace,
  nameInCollection,
  renameSpace,
  syncSpace,
} from '../src/logic/actions';
import { inviteLink, inviteOf, needsAccess, parseInviteText } from '../src/logic/invite';
import { createDevice, createRemote, type Device } from './helpers';

const github = { type: 'github', address: 'me/household', access: { token: 'github_pat_SECRET' } };

async function created(name = 'Home') {
  const remote = createRemote();
  const a = createDevice(remote);
  const result = await createSpace({ name, storage: github }, a.deps);
  if (!result.ok) throw new Error(`create failed: ${result.failure}`);
  const space = await a.store.getSpace(result.id);
  if (!space) throw new Error('not stored');
  return { remote, a, space, id: result.id };
}

test('create: the space is stored, its name written to the collection and the storage, a cycle ran', async () => {
  const { remote, a, space, id } = await created('  Home  ');
  expect(space.name).toBe('Home');
  expect(space.secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(space.storage).toEqual(github);
  expect(await nameInCollection(a.store, id)).toBe('Home');
  const state = await a.store.readCollection(id, 'space');
  expect(state.syncedAt).toBeDefined();
  expect(state.etag).toBeDefined();
  const file = remote.files.get(`${id}/space.json`);
  expect(file).toBeDefined();
  // The file is sealed: neither the name nor the token is readable in it.
  expect(file?.body).not.toContain('Home');
  expect(file?.body).not.toContain('SECRET');
});

test('create: a bad name creates nothing', async () => {
  const remote = createRemote();
  const a = createDevice(remote);
  expect((await createSpace({ name: '   ', storage: github }, a.deps)).ok).toBe(false);
  expect((await createSpace({ name: 'x'.repeat(61), storage: github }, a.deps)).ok).toBe(false);
  expect(await a.store.listSpaces()).toEqual([]);
  expect(remote.writes).toBe(0);
});

test('create: a failing cycle takes the space off the device again and says why', async () => {
  const remote = createRemote();
  remote.failRead = { failure: 'unauthorised' };
  const a = createDevice(remote);
  const result = await createSpace({ name: 'Home', storage: github }, a.deps);
  expect(result).toEqual({ ok: false, failure: 'unauthorised' });
  expect(await a.store.listSpaces()).toEqual([]);
  remote.failRead = { failure: 'server', detail: 'HTTP 502' };
  expect(await createSpace({ name: 'Home', storage: github }, a.deps)).toEqual({
    ok: false,
    failure: 'server',
    detail: 'HTTP 502',
  });
});

test('create: a storage the host cannot use is bad-storage, not a crash', async () => {
  const remote = createRemote();
  const a = createDevice(remote);
  a.deps.adapter = () => {
    throw new RangeError('no token');
  };
  expect(await createSpace({ name: 'Home', storage: github }, a.deps)).toEqual({
    ok: false,
    failure: 'bad-storage',
  });
  expect(await a.store.listSpaces()).toEqual([]);
});

test('join with the access in the invite: the second device reads the name the first wrote', async () => {
  const { remote, space, id } = await created('Zuhause');
  const invite = parseInviteText(inviteLink('https://domus.test/', space, true));
  if (!invite.ok) throw new Error('parse');
  expect(needsAccess(invite.invite)).toBe(false);
  const b = createDevice(remote, Date.UTC(2026, 10, 19, 13));
  const result = await joinSpace(invite.invite, invite.invite.access, b.deps);
  expect(result).toEqual({ ok: true, id, name: 'Zuhause', found: true });
  const joined = await b.store.getSpace(id);
  expect(joined?.name).toBe('Zuhause');
  expect(joined?.storage).toEqual(github);
  expect(b.github.tested).toEqual([{ repository: 'me/household', token: 'github_pat_SECRET' }]);
});

test('join without the access: the person enters their own, which is what is stored', async () => {
  const { remote, space, id } = await created();
  const parsed = parseInviteText(inviteLink('https://domus.test/', space, false));
  if (!parsed.ok) throw new Error('parse');
  expect(needsAccess(parsed.invite)).toBe(true);
  expect(parsed.invite.access).toBeUndefined();
  const b = createDevice(remote);
  const result = await joinSpace(parsed.invite, { token: 'github_pat_OTHER' }, b.deps);
  expect(result.ok).toBe(true);
  expect((await b.store.getSpace(id))?.storage.access).toEqual({ token: 'github_pat_OTHER' });
  expect(b.github.tested[0]?.token).toBe('github_pat_OTHER');
});

test('join twice: the second time changes nothing and says it is already here', async () => {
  const { remote, space, id } = await created();
  const invite = inviteOf(space, true);
  const b = createDevice(remote);
  expect((await joinSpace(invite, invite.access, b.deps)).ok).toBe(true);
  const writes = remote.writes;
  const again = await joinSpace(invite, invite.access, b.deps);
  expect(again).toEqual({ ok: false, alreadyHere: true, id });
  expect(remote.writes).toBe(writes);
  expect(await b.store.listSpaces()).toHaveLength(1);
  // The creating device has it too.
  const onA = createDevice(remote);
  await onA.store.putSpace(space);
  expect(await joinSpace(invite, invite.access, onA.deps)).toMatchObject({ alreadyHere: true });
});

test('join: a wrong token, a read-only token and an unreachable storage store nothing', async () => {
  const { remote, space } = await created();
  const invite = inviteOf(space, true);
  const b = createDevice(remote);
  b.github.test = { state: 'unauthorised' };
  expect(await joinSpace(invite, invite.access, b.deps)).toEqual({
    ok: false,
    failure: 'unauthorised',
  });
  b.github.test = { state: 'reachable', private: true, canWrite: false, empty: false };
  expect(await joinSpace(invite, invite.access, b.deps)).toEqual({ ok: false, readonly: true });
  b.github.test = { state: 'server', detail: 'rate-limited until 2026-11-19T13:00:00.000Z' };
  expect(await joinSpace(invite, invite.access, b.deps)).toEqual({
    ok: false,
    failure: 'server',
    detail: 'rate-limited until 2026-11-19T13:00:00.000Z',
  });
  expect(await b.store.listSpaces()).toEqual([]);
});

test('join: a public repository is allowed (the warning belongs to creating)', async () => {
  const { remote, space } = await created();
  const invite = inviteOf(space, true);
  const b = createDevice(remote);
  b.github.test = { state: 'reachable', private: false, canWrite: true, empty: false };
  expect((await joinSpace(invite, invite.access, b.deps)).ok).toBe(true);
});

test('join: a cycle that fails removes the space again', async () => {
  const { remote, space } = await created();
  const invite = inviteOf(space, true);
  const b = createDevice(remote);
  remote.failRead = { failure: 'blocked' };
  expect(await joinSpace(invite, invite.access, b.deps)).toEqual({
    ok: false,
    failure: 'blocked',
  });
  expect(await b.store.listSpaces()).toEqual([]);
});

test('join: a storage without data for the space keeps the name of the invite and says so', async () => {
  const { space } = await created();
  const invite = inviteOf(space, true);
  const b = createDevice(createRemote());
  const result = await joinSpace(invite, invite.access, b.deps);
  expect(result).toMatchObject({ ok: true, name: 'Home', found: false });
});

test('join with a secret that is none is bad-secret', async () => {
  const b = createDevice(createRemote());
  expect(
    await joinSpace(
      { secret: 'nope', storage: { type: 'github', address: 'a/b' } },
      { token: 't' },
      b.deps,
    ),
  ).toEqual({ ok: false, failure: 'bad-secret' });
});

test('rename on one device reaches the other with Sync now, in both directions', async () => {
  const { remote, a, space, id } = await created('Home');
  const invite = inviteOf(space, true);
  const b = createDevice(remote, Date.UTC(2026, 10, 19, 14));
  await joinSpace(invite, invite.access, b.deps);

  const renamed = await renameSpace(id, 'Flat', b.deps);
  expect(renamed.saved).toBe(true);
  expect(renamed.outcome?.ok).toBe(true);
  expect((await b.store.getSpace(id))?.name).toBe('Flat');

  const onA = await a.store.getSpace(id);
  if (!onA) throw new Error('gone');
  expect(onA.name).toBe('Home');
  const synced = await syncSpace(onA, a.deps);
  expect(synced.ok && synced.name).toBe('Flat');
  expect((await a.store.getSpace(id))?.name).toBe('Flat');

  a.tick();
  await renameSpace(id, 'Wohnung', a.deps);
  const onB = await b.store.getSpace(id);
  if (!onB) throw new Error('gone');
  await syncSpace(onB, b.deps);
  expect((await b.store.getSpace(id))?.name).toBe('Wohnung');
});

test('rename keeps the name when the cycle fails, and refuses a bad name', async () => {
  const { remote, a, id } = await created('Home');
  remote.failRead = { failure: 'blocked' };
  const result = await renameSpace(id, 'Flat', a.deps);
  expect(result.saved).toBe(true);
  expect(result.outcome).toEqual({ ok: false, failure: 'blocked' });
  expect((await a.store.getSpace(id))?.name).toBe('Flat');
  expect(await renameSpace(id, '  ', a.deps)).toEqual({ saved: false });
  expect((await a.store.getSpace(id))?.name).toBe('Flat');
});

test('change access: stored only when the storage accepts it', async () => {
  const { a, id } = await created();
  a.github.test = { state: 'unauthorised' };
  expect(await changeAccess(id, { token: 'new' }, a.deps)).toEqual({
    ok: false,
    failure: 'unauthorised',
  });
  expect((await a.store.getSpace(id))?.storage.access).toEqual({ token: 'github_pat_SECRET' });
  a.github.test = { state: 'reachable', private: true, canWrite: true, empty: false };
  const result = await changeAccess(id, { token: 'new' }, a.deps);
  expect(result.ok).toBe(true);
  expect((await a.store.getSpace(id))?.storage.access).toEqual({ token: 'new' });
});

test('webdav: the probe is the test, and a storage that answers 401 is unauthorised', async () => {
  const remote = createRemote();
  const a = createDevice(remote);
  const dav = {
    type: 'webdav',
    address: 'https://dav.example/x',
    access: { username: 'u', password: 'p' },
  };
  const ok = await createSpace({ name: 'Home', storage: dav }, a.deps);
  expect(ok.ok).toBe(true);
  const b = createDevice(remote);
  const [first] = await a.store.listSpaces();
  if (!first) throw new Error('no space');
  const invite = inviteOf(first, false);
  expect(needsAccess(invite)).toBe(true);
  remote.failRead = { failure: 'unauthorised' };
  expect(await joinSpace(invite, { username: 'x', password: 'y' }, b.deps)).toEqual({
    ok: false,
    failure: 'unauthorised',
  });
});

// ---- A space on this device only (made by an app before sync was set up) --------------------

/** A device with the space an app made, and something an app keeps in it. */
async function deviceOnly(remote = createRemote()) {
  const a = createDevice(remote);
  const [space] = await ensureSpace(a.store, 'Home');
  if (!space) throw new Error('no space');
  await localChange(a.store, space.id, 'stock', a.deps.now, () => ({
    put: [{ key: 'gin', value: { amount: 700 } }],
  }));
  return { remote, a, space, id: space.id };
}
const stockOf = async (a: Device, id: string) =>
  (await a.store.readCollection(id, 'stock')).records.map((r) => r.key);

test('device only: rename is kept and written to the collection, without a cycle', async () => {
  const { remote, a, id } = await deviceOnly();
  expect(await renameSpace(id, ' Flat ', a.deps)).toEqual({ saved: true });
  expect((await a.store.getSpace(id))?.name).toBe('Flat');
  expect(await nameInCollection(a.store, id)).toBe('Flat');
  expect((await a.store.readCollection(id, 'space')).syncedAt).toBeUndefined();
  expect(remote.reads).toBe(0);
  expect(remote.writes).toBe(0);
});

test('device only: a cycle that is asked for all the same fails in words and sends nothing', async () => {
  const { remote, a, space } = await deviceOnly();
  expect(await syncSpace(space, a.deps)).toEqual({ ok: false, failure: 'bad-storage' });
  expect(await changeAccess(space.id, { token: 't' }, a.deps)).toEqual({
    ok: false,
    failure: 'bad-storage',
  });
  expect(isDeviceOnly((await a.store.getSpace(space.id)) ?? space)).toBe(true);
  expect(remote.reads + remote.writes).toBe(0);
});

test('connect: the space keeps id and secret, gets the storage, its name is written and a cycle ran', async () => {
  const { remote, a, space, id } = await deviceOnly();
  expect(await nameInCollection(a.store, id)).toBeUndefined();
  const result = await connectStorage(id, github, a.deps);
  expect(result).toEqual({ ok: true, outcome: { ok: true, name: 'Home', wrote: true } });
  const now = await a.store.getSpace(id);
  expect(now).toEqual({ ...space, storage: github });
  expect(await nameInCollection(a.store, id)).toBe('Home');
  expect((await a.store.readCollection(id, 'space')).syncedAt).toBeDefined();
  expect(a.github.tested).toEqual([{ repository: 'me/household', token: 'github_pat_SECRET' }]);
  // Only the `space` collection is sent here; the apps send theirs when they are opened.
  expect([...remote.files.keys()]).toEqual([`${id}/space.json`]);
  expect(await stockOf(a, id)).toEqual(['gin']);

  // A second device joins with the invite and reads the name.
  if (!now) throw new Error('gone');
  const invite = inviteOf(now, true);
  const b = createDevice(remote, Date.UTC(2026, 10, 19, 13));
  expect(await joinSpace(invite, invite.access, b.deps)).toEqual({
    ok: true,
    id,
    name: 'Home',
    found: true,
  });
});

test('connect: a name given while on this device only is the one that is sent', async () => {
  const { remote, a, id } = await deviceOnly();
  await renameSpace(id, 'Flat', a.deps);
  const result = await connectStorage(id, github, a.deps);
  expect(result.ok && result.outcome.ok && result.outcome.name).toBe('Flat');
  const b = createDevice(remote);
  const space = await a.store.getSpace(id);
  if (!space) throw new Error('gone');
  const invite = inviteOf(space, true);
  expect(await joinSpace(invite, invite.access, b.deps)).toMatchObject({ ok: true, name: 'Flat' });
});

test('connect: a storage that is refused stores nothing and runs no cycle', async () => {
  const { remote, a, space, id } = await deviceOnly();
  a.github.test = { state: 'unauthorised' };
  expect(await connectStorage(id, github, a.deps)).toEqual({ ok: false, failure: 'unauthorised' });
  a.github.test = { state: 'reachable', private: true, canWrite: false, empty: false };
  expect(await connectStorage(id, github, a.deps)).toEqual({ ok: false, readonly: true });
  expect(await a.store.getSpace(id)).toEqual(space);
  expect(remote.reads + remote.writes).toBe(0);
});

test('connect: a failing cycle puts the space back on this device only, with its data, and says why', async () => {
  const { remote, a, space, id } = await deviceOnly();
  remote.failRead = { failure: 'server', detail: 'HTTP 502' };
  expect(await connectStorage(id, github, a.deps)).toEqual({
    ok: false,
    failure: 'server',
    detail: 'HTTP 502',
  });
  // Back to what it was: same id, secret and name, no storage and no token left behind.
  expect(await a.store.getSpace(id)).toEqual(space);
  expect(JSON.stringify(await a.store.listSpaces())).not.toContain('SECRET');
  expect(await stockOf(a, id)).toEqual(['gin']);
  expect(await nameInCollection(a.store, id)).toBe('Home');
  expect(remote.writes).toBe(0);
  // Rename still works without a cycle, and the next try succeeds.
  expect(await renameSpace(id, 'Flat', a.deps)).toEqual({ saved: true });
  remote.failRead = undefined;
  expect((await connectStorage(id, github, a.deps)).ok).toBe(true);
  expect((await a.store.getSpace(id))?.storage).toEqual(github);
  expect(await stockOf(a, id)).toEqual(['gin']);
});

test('connect: a storage the host cannot use is bad-storage and the space stays as it was', async () => {
  const { a, space, id } = await deviceOnly();
  const dav = { type: 'webdav', address: 'https://dav.example/x' };
  a.deps.adapter = () => {
    throw new RangeError('bad address');
  };
  expect(await connectStorage(id, dav, a.deps)).toEqual({ ok: false, failure: 'bad-storage' });
  expect(await connectStorage(id, space.storage, a.deps)).toEqual({
    ok: false,
    failure: 'bad-storage',
  });
  expect(await a.store.getSpace(id)).toEqual(space);
});

test('connect: a space that has a storage, or is not here, is not touched', async () => {
  const { a, space, id } = await created();
  const other = { type: 'github', address: 'me/other', access: { token: 'x' } };
  expect(await connectStorage(id, other, a.deps)).toEqual({ ok: false, failure: 'unexpected' });
  expect(await a.store.getSpace(id)).toEqual(space);
  expect(await connectStorage('ab'.repeat(16), other, a.deps)).toEqual({
    ok: false,
    failure: 'unexpected',
  });
});

test('connect: a storage that already holds the file of this space is merged by the cycle', async () => {
  // Cannot happen with a fresh secret; here the same secret is on two devices, one of which
  // wrote to the storage first.
  const { remote, a, space, id } = await created('Family');
  const b = createDevice(remote, Date.UTC(2026, 10, 19, 14));
  await b.store.putSpace({
    id,
    secret: space.secret,
    name: 'Home',
    storage: { type: 'device', address: '' },
  });
  const result = await connectStorage(id, github, b.deps);
  // B wrote its name later than A wrote the file's: the later one wins on both devices.
  expect(result).toEqual({ ok: true, outcome: { ok: true, name: 'Home', wrote: true } });
  expect((await b.store.getSpace(id))?.storage).toEqual(github);
  const synced = await syncSpace(space, a.deps);
  expect(synced.ok && synced.name).toBe('Home');
});
