// The invite text and link: the round trip, every refusal, what is never in
// them, and the join draft an opened link fills.
import { beforeEach, expect, test } from 'vitest';
import { drafts, resetAll } from '../src/screens/sync/drafts';
import { fillJoinDraft } from '../src/screens/sync/invite-draft';
import { inviteProblemTexts } from '../src/screens/sync/strings';
import { type Binding, type Storage } from '../src/store';
import { inviteText, readInvite, type InviteFailure } from '../src/sync/invite';
import { makeInviteLink, readInviteLink } from '../src/sync/invite-link';
import { shareValues, type ShareValues } from '../src/sync/share-values';
import { encodePayload } from '../src/share/link';

const PLACE = 'u-3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b';
const ADDRESS = 'https://dav.example/remote.php/dav/files/me';
const APP = 'https://drinks.example/app/';
const VALUES: ShareValues = {
  address: ADDRESS,
  folder: 'flat/stock',
  placeCode: PLACE,
  passphrase: 'ABCD-EFGH-JKMN-PQRS-TVWX',
};

const good = (): Record<string, unknown> => JSON.parse(inviteText(VALUES));
const read = (o: Record<string, unknown>) => readInvite(JSON.stringify(o));
const reason = (o: Record<string, unknown>): string | undefined => {
  const r = read(o);
  return r.ok ? undefined : r.reason;
};

beforeEach(() => resetAll());

test('values become text, a link and the same values again', async () => {
  const link = await makeInviteLink(VALUES, APP);
  expect(link.startsWith(`${APP}#/join/1.`)).toBe(true);
  const payload = link.slice(link.indexOf('#/join/') + '#/join/'.length);
  expect(await readInviteLink(payload)).toEqual({ ok: true, invite: VALUES });
  expect(readInvite(inviteText(VALUES))).toEqual({ ok: true, invite: VALUES });
});

test('the text names the format, version and type', () => {
  expect(good()).toEqual({
    format: 'materia-invite',
    version: 1,
    kind: 'place',
    type: 'webdav',
    address: ADDRESS,
    folder: 'flat/stock',
    place: PLACE,
    passphrase: VALUES.passphrase,
  });
});

test('the storage user name and password are in neither the text nor the link', async () => {
  const storage: Storage = {
    id: 'u-1',
    label: 'Cloud',
    type: 'webdav',
    baseUrl: ADDRESS,
    username: 'kim-the-user',
    password: 'hunter2-storage',
  };
  const binding: Binding = {
    unitKind: 'place',
    unitId: PLACE,
    storageId: storage.id,
    folder: 'flat/stock',
    passphrase: VALUES.passphrase,
  };
  const values = shareValues(storage, binding);
  const text = inviteText(values);
  const link = await makeInviteLink(values, APP);
  const payload = link.slice(link.indexOf('#/join/') + '#/join/'.length);
  const decoded = await readInviteLink(payload);
  for (const secret of ['kim-the-user', 'hunter2-storage']) {
    expect(text).not.toContain(secret);
    expect(link).not.toContain(secret);
    expect(JSON.stringify(decoded)).not.toContain(secret);
  }
  expect(Object.keys(good()).sort()).toEqual(
    ['address', 'folder', 'format', 'kind', 'passphrase', 'place', 'type', 'version'].sort(),
  );
});

test('an invite in the old mixtura-invite format is still a place', () => {
  const old: Record<string, unknown> = { ...good(), format: 'mixtura-invite' };
  delete old.kind;
  expect(read(old)).toEqual({ ok: true, invite: VALUES });
  expect(reason({ ...old, version: 2 })).toBe('version');
  expect(read({ ...old, kind: 'library' })).toEqual({ ok: true, invite: VALUES });
  expect(inviteProblemTexts.kind).toContain('only join places');
});

test('unknown extra fields are ignored', () => {
  expect(read({ ...good(), username: 'x', extra: { a: 1 } })).toEqual({ ok: true, invite: VALUES });
});

test('address and folder are normalised like the sheet does', () => {
  const r = read({ ...good(), address: `${ADDRESS}///`, folder: '/flat//stock/' });
  expect(r).toEqual({ ok: true, invite: VALUES });
  const empty = read({ ...good(), folder: '' });
  expect(empty.ok && empty.invite.folder).toBe('household');
});

test('every refusal has its reason', () => {
  const cases: [Record<string, unknown>, InviteFailure][] = [
    [{ ...good(), version: 2 }, 'version'],
    [{ ...good(), version: 0 }, 'version'],
    [{ ...good(), kind: 'library' }, 'kind'],
    [{ ...good(), kind: undefined }, 'damaged'],
    [{ ...good(), kind: 5 }, 'damaged'],
    [{ ...good(), type: 's3' }, 'type'],
    [{ ...good(), passphrase: '' }, 'no-passphrase'],
    [{ ...good(), passphrase: '   ' }, 'no-passphrase'],
    [{ ...good(), passphrase: 5 }, 'no-passphrase'],
    [{ ...good(), address: 'ftp://dav.example' }, 'bad-address'],
    [{ ...good(), address: 'https://user:pw@dav.example' }, 'bad-address'],
    [{ ...good(), address: 7 }, 'bad-address'],
    [{ ...good(), folder: '../x' }, 'bad-folder'],
    [{ ...good(), folder: ['a'] }, 'bad-folder'],
    [{ ...good(), place: 'flat' }, 'bad-place'],
    [{ ...good(), place: undefined }, 'bad-place'],
    [{ ...good(), format: 'other' }, 'damaged'],
    [{ ...good(), version: '1' }, 'damaged'],
  ];
  for (const [input, expected] of cases)
    expect(reason(input), JSON.stringify(input)).toBe(expected);
  const without = good();
  delete without.passphrase;
  expect(reason(without)).toBe('no-passphrase');
});

test('text that is no invite is damaged; sizes are capped', () => {
  for (const text of ['', 'nope', '[]', 'null', '"x"', '{']) {
    expect(readInvite(text)).toEqual({ ok: false, reason: 'damaged' });
  }
  expect(reason({ ...good(), passphrase: 'x'.repeat(600) })).toBe('damaged');
  expect(readInvite(JSON.stringify({ ...good(), pad: 'x'.repeat(5000) }))).toEqual({
    ok: false,
    reason: 'damaged',
  });
});

test('a payload that cannot be read says why', async () => {
  expect(await readInviteLink('')).toEqual({ ok: false, reason: 'damaged' });
  expect(await readInviteLink('1.!!!')).toEqual({ ok: false, reason: 'damaged' });
  expect(await readInviteLink('9.AAAA')).toEqual({ ok: false, reason: 'version' });
  expect(await readInviteLink(`1.${'A'.repeat(9000)}`)).toEqual({ ok: false, reason: 'damaged' });
  expect(await readInviteLink(await encodePayload('not json'))).toEqual({
    ok: false,
    reason: 'damaged',
  });
  const newer = await encodePayload(JSON.stringify({ ...good(), version: 2 }));
  expect(await readInviteLink(newer)).toEqual({ ok: false, reason: 'version' });
  const big = await encodePayload(JSON.stringify({ ...good(), pad: 'a'.repeat(100000) }));
  expect(await readInviteLink(big)).toEqual({ ok: false, reason: 'damaged' });
});

test('an invite fills the join draft', () => {
  fillJoinDraft({ ok: true, invite: VALUES });
  expect(drafts.join).toMatchObject({
    folder: 'flat/stock',
    code: PLACE,
    passphrase: VALUES.passphrase,
    address: ADDRESS,
    picked: false,
    problem: null,
  });
});

test('an invite that cannot be used leaves the draft empty with its text', () => {
  drafts.join.passphrase = 'left over';
  fillJoinDraft({ ok: false, reason: 'no-passphrase' });
  expect(drafts.join.passphrase).toBe('');
  expect(drafts.join.address).toBe('');
  expect(drafts.join.problem).toBe(inviteProblemTexts['no-passphrase']);
  expect(inviteProblemTexts.version).toContain('Update the app');
});
