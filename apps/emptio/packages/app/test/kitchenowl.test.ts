// The KitchenOwl bridge against a KitchenOwl list in memory: what is put on
// either list appears on the other, ticking on either side takes it off the
// other, amounts follow, a rename, two devices that bridge at once, a failure
// half way. Not proven here: a real KitchenOwl server, its HTTP and CORS, a
// real clock, real devices (the fake and the shared database are in memory).
import { expect, test } from 'vitest';
import { createMemoryStore, type Store } from '@nexumia-de/hospes';
import { addToList, editEntry, removeEntries, setBought } from '../src/list/actions';
import { LIST, entriesOf } from '../src/list/model';
import { bridgeCycle } from '../src/kitchenowl/bridge';
import { KitchenowlError, type KitchenowlClient } from '../src/kitchenowl/client';
import {
  KITCHENOWL,
  configOf,
  connectKitchenowl,
  disconnectKitchenowl,
  instanceUrl,
  linksOf,
} from '../src/kitchenowl/config';
import { importedId, planCycle } from '../src/kitchenowl/plan';
import { deps, putSpace } from './helpers';
import { fakeKitchenowl } from './kitchenowl-fake';

const CONFIG = { url: 'https://ko.example', token: 'llt', householdId: 1, listId: 7 };
const noFetch = () => Promise.reject(new Error('the fake client is used'));

async function connected(store: Store = createMemoryStore(), prefix = 'e') {
  const d = { ...deps(store, prefix), fetch: noFetch };
  const space = await putSpace(store, 'home', 'Home');
  await connectKitchenowl(d, space, CONFIG);
  return { d, space };
}

/** The id of an entry an action put on the list. */
function idOf(added: { id: string } | null): string {
  if (added === null) throw new Error('nothing was added');
  return added.id;
}

async function list(store: Store, space: string) {
  const entries = entriesOf((await store.readCollection(space, LIST)).records);
  return entries
    .map((e) => ({ name: e.name, amount: e.amount ?? '', bought: e.bought !== undefined }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}

test('without a connection a cycle does nothing and asks nothing', async () => {
  const store = createMemoryStore();
  const d = { ...deps(store), fetch: noFetch };
  const space = await putSpace(store, 'home', 'Home');
  const ko = fakeKitchenowl();
  expect(await bridgeCycle(d, space, ko.client)).toEqual({ state: 'off' });
  expect(ko.state.requests).toBe(0);
});

test('what is on either list appears on the other, with its amount', async () => {
  const { d, space } = await connected();
  const ko = fakeKitchenowl();
  await addToList(d, space, { name: 'Milk', amount: '2 l' });
  ko.person.add('Bread', 'whole grain');
  expect(await bridgeCycle(d, space, ko.client)).toEqual({ state: 'synced', changed: true });
  expect(ko.person.list()).toEqual([
    { name: 'Bread', description: 'whole grain' },
    { name: 'Milk', description: '2 l' },
  ]);
  expect(await list(d.store, space)).toEqual([
    { name: 'Bread', amount: 'whole grain', bought: false },
    { name: 'Milk', amount: '2 l', bought: false },
  ]);
  // A second cycle finds both sides in step.
  const before = ko.state.requests;
  expect(await bridgeCycle(d, space, ko.client)).toEqual({ state: 'synced', changed: false });
  expect(ko.state.requests).toBe(before + 1);
});

test('the same thing on both lists becomes one, by its sort key', async () => {
  const { d, space } = await connected();
  const ko = fakeKitchenowl();
  await addToList(d, space, { name: 'Äpfel' });
  ko.person.add('apfel', '1 kg');
  await bridgeCycle(d, space, ko.client);
  expect(await list(d.store, space)).toEqual([{ name: 'Äpfel', amount: '1 kg', bought: false }]);
  expect(ko.person.list()).toEqual([{ name: 'apfel', description: '1 kg' }]);
});

test('ticking in KitchenOwl ticks the entry; ticking in Emptio takes it off KitchenOwl', async () => {
  const { d, space } = await connected();
  const ko = fakeKitchenowl();
  const milk = await addToList(d, space, { name: 'Milk' });
  const eggs = await addToList(d, space, { name: 'Eggs' });
  await bridgeCycle(d, space, ko.client);

  ko.person.tick('Milk');
  await setBought(d, space, idOf(eggs), true);
  await bridgeCycle(d, space, ko.client);
  expect(ko.person.list()).toEqual([]);
  expect(await list(d.store, space)).toEqual([
    { name: 'Eggs', amount: '', bought: true },
    { name: 'Milk', amount: '', bought: true },
  ]);
  expect(linksOf((await d.store.readCollection(space, KITCHENOWL)).records).size).toBe(0);

  // Unticked in Emptio: back on KitchenOwl's list.
  await setBought(d, space, idOf(milk), false);
  await bridgeCycle(d, space, ko.client);
  expect(ko.person.list()).toEqual([{ name: 'Milk', description: '' }]);
});

test('an entry removed in Emptio leaves KitchenOwl and does not come back', async () => {
  const { d, space } = await connected();
  const ko = fakeKitchenowl();
  const milk = await addToList(d, space, { name: 'Milk' });
  await bridgeCycle(d, space, ko.client);
  await removeEntries(d, space, [idOf(milk)]);
  await bridgeCycle(d, space, ko.client);
  await bridgeCycle(d, space, ko.client);
  expect(ko.person.list()).toEqual([]);
  expect(await list(d.store, space)).toEqual([]);
});

test('amounts follow the side that changed; when both changed, Emptio wins', async () => {
  const { d, space } = await connected();
  const ko = fakeKitchenowl();
  const milk = await addToList(d, space, { name: 'Milk', amount: '1 l' });
  const bread = await addToList(d, space, { name: 'Bread' });
  await bridgeCycle(d, space, ko.client);
  const edit = { note: '', priority: 'soon' as const, categoryId: 'other' };

  ko.person.describe('Milk', '3 l');
  await editEntry(d, space, idOf(bread), { ...edit, name: 'Bread', amount: '2' });
  await bridgeCycle(d, space, ko.client);
  expect(await list(d.store, space)).toEqual([
    { name: 'Bread', amount: '2', bought: false },
    { name: 'Milk', amount: '3 l', bought: false },
  ]);
  expect(ko.person.list()).toContainEqual({ name: 'Bread', description: '2' });

  ko.person.describe('Milk', '4 l');
  await editEntry(d, space, idOf(milk), { ...edit, name: 'Milk', amount: '5 l' });
  await bridgeCycle(d, space, ko.client);
  expect(ko.person.list()).toContainEqual({ name: 'Milk', description: '5 l' });
  expect(await list(d.store, space)).toContainEqual({ name: 'Milk', amount: '5 l', bought: false });
});

test('a rename in Emptio puts the new name on KitchenOwl instead of the old one', async () => {
  const { d, space } = await connected();
  const ko = fakeKitchenowl();
  const milk = await addToList(d, space, { name: 'Milk' });
  await bridgeCycle(d, space, ko.client);
  const edit = { amount: '', note: '', priority: 'soon' as const, categoryId: 'other' };
  await editEntry(d, space, idOf(milk), { ...edit, name: 'Oat milk' });
  await bridgeCycle(d, space, ko.client);
  expect(ko.person.list()).toEqual([{ name: 'Oat milk', description: '' }]);
  expect(await list(d.store, space)).toEqual([{ name: 'Oat milk', amount: '', bought: false }]);
});

test('two devices that import the same putting make one entry', async () => {
  // Two devices share one database here; the deterministic id is what keeps them to one entry
  // once their records merge.
  const ko = fakeKitchenowl();
  ko.person.add('Butter');
  const a = await connected();
  const b = { ...deps(a.d.store, 'b'), fetch: noFetch };
  await Promise.all([bridgeCycle(a.d, a.space, ko.client), bridgeCycle(b, a.space, ko.client)]);
  expect(await list(a.d.store, a.space)).toEqual([{ name: 'Butter', amount: '', bought: false }]);
  expect(ko.person.list()).toEqual([{ name: 'Butter', description: '' }]);
});

test('an imported entry removed before its link was written is taken off KitchenOwl', () => {
  const item = { itemId: 5, name: 'Salt', description: '', createdAt: 'Sun, 22 Nov 2026' };
  const plan = planCycle({
    listId: 7,
    entries: [],
    keys: new Set([importedId(7, item)]),
    links: new Map(),
    items: [item],
  });
  expect(plan).toEqual({
    remote: [{ kind: 'remove', itemId: 5 }],
    entries: [],
    link: [],
    unlink: [],
  });
});

test('a failure half way keeps what went through and says why', async () => {
  const { d, space } = await connected();
  const ko = fakeKitchenowl();
  await addToList(d, space, { name: 'Milk' });
  await addToList(d, space, { name: 'Eggs' });
  let adds = 0;
  const flaky: KitchenowlClient = {
    ...ko.client,
    add: (...args) =>
      ++adds === 2 ? Promise.reject(new KitchenowlError('unreachable')) : ko.client.add(...args),
  };
  expect(await bridgeCycle(d, space, flaky)).toEqual({
    state: 'failed',
    failure: 'unreachable',
    changed: true,
  });
  expect(ko.person.list()).toHaveLength(1);
  await bridgeCycle(d, space, ko.client);
  expect(ko.person.list().map((i) => i.name)).toEqual(['Eggs', 'Milk']);
  expect(await list(d.store, space)).toHaveLength(2);
});

test('an unreachable KitchenOwl changes nothing', async () => {
  const { d, space } = await connected();
  const ko = fakeKitchenowl();
  ko.state.down = true;
  await addToList(d, space, { name: 'Milk' });
  expect(await bridgeCycle(d, space, ko.client)).toEqual({
    state: 'failed',
    failure: 'unreachable',
    changed: false,
  });
});

test('connecting again forgets the links of the earlier list; disconnecting keeps the list', async () => {
  const { d, space } = await connected();
  const ko = fakeKitchenowl();
  await addToList(d, space, { name: 'Milk' });
  await bridgeCycle(d, space, ko.client);
  const records = async () => (await d.store.readCollection(space, KITCHENOWL)).records;
  expect(linksOf(await records()).size).toBe(1);
  await connectKitchenowl(d, space, { ...CONFIG, listId: 8 });
  expect(linksOf(await records()).size).toBe(0);
  expect(configOf(await records())?.listId).toBe(8);
  await disconnectKitchenowl(d, space);
  expect(configOf(await records())).toBeUndefined();
  expect(await list(d.store, space)).toHaveLength(1);
});

test('the address of an instance is made comparable, and only a web address is one', () => {
  expect(instanceUrl(' https://ko.example/ ')).toBe('https://ko.example');
  expect(instanceUrl('https://ko.example/kitchen/api/')).toBe('https://ko.example/kitchen');
  expect(instanceUrl('http://192.168.1.5:8080')).toBe('http://192.168.1.5:8080');
  expect(instanceUrl('ko.example')).toBeNull();
  expect(instanceUrl('ftp://ko.example')).toBeNull();
  expect(instanceUrl('https://me:pw@ko.example')).toBeNull();
});
