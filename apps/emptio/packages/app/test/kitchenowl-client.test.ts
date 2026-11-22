// The requests the client sends and how it reads the answers, against a fetch
// that records them. The paths and bodies are those of KitchenOwl's backend
// source as read on 2026-11-22; not proven here: a real server.
import { expect, test } from 'vitest';
import { KitchenowlError, createKitchenowlClient, type Fetch } from '../src/kitchenowl/client';

function recording(answer: (url: string) => { status: number; body: unknown }) {
  const sent: { url: string; method: string; headers: Record<string, string>; body?: string }[] =
    [];
  const fetch: Fetch = (url, init) => {
    sent.push({ url, ...init });
    const { status, body } = answer(url);
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
  };
  return { fetch, sent };
}

const client = (fetch: Fetch) =>
  createKitchenowlClient({ url: 'https://ko.example', token: 'T', fetch });

test('it reads households, lists and items with the token', async () => {
  const { fetch, sent } = recording((url) => {
    if (url.endsWith('/household')) return { status: 200, body: [{ id: 1, name: 'Home' }] };
    if (url.endsWith('/shoppinglist'))
      return { status: 200, body: [{ id: 7, name: 'Groceries', items: [] }] };
    return {
      status: 200,
      body: [
        { id: 3, name: 'Milk', description: '2 l', created_at: 'Sun, 22 Nov 2026 10:00:00 GMT' },
        { id: 4, name: 'Bread' },
        { name: 'broken' },
      ],
    };
  });
  const ko = client(fetch);
  expect(await ko.households()).toEqual([{ id: 1, name: 'Home' }]);
  expect(await ko.lists(1)).toEqual([{ id: 7, name: 'Groceries' }]);
  expect(await ko.items(7)).toEqual([
    { itemId: 3, name: 'Milk', description: '2 l', createdAt: 'Sun, 22 Nov 2026 10:00:00 GMT' },
    { itemId: 4, name: 'Bread', description: '', createdAt: '' },
  ]);
  expect(sent.map((s) => `${s.method} ${s.url}`)).toEqual([
    'GET https://ko.example/api/household',
    'GET https://ko.example/api/household/1/shoppinglist',
    'GET https://ko.example/api/shoppinglist/7/items',
  ]);
  expect(sent[0]?.headers['Authorization']).toBe('Bearer T');
});

test('it adds, describes and removes with the bodies KitchenOwl expects', async () => {
  const { fetch, sent } = recording(() => ({ status: 200, body: { id: 9, name: 'Eggs' } }));
  const ko = client(fetch);
  expect(await ko.add(7, 'Eggs', '10')).toBe(9);
  await ko.describe(7, 9, '12');
  await ko.remove(7, 9, 1_795_000_000_000);
  expect(sent.map((s) => [s.method, s.url, s.body])).toEqual([
    [
      'POST',
      'https://ko.example/api/shoppinglist/7/add-item-by-name',
      '{"name":"Eggs","description":"10"}',
    ],
    ['POST', 'https://ko.example/api/shoppinglist/7/item/9', '{"description":"12"}'],
    [
      'DELETE',
      'https://ko.example/api/shoppinglist/7/item',
      '{"item_id":9,"removed_at":1795000000000}',
    ],
  ]);
});

test('failures are named: no answer, a refused token, a missing list, anything else', async () => {
  const failing = (status: number) => client(recording(() => ({ status, body: {} })).fetch);
  const down = client(() => Promise.reject(new TypeError('Failed to fetch')));
  await expect(down.items(7)).rejects.toEqual(new KitchenowlError('unreachable'));
  await expect(failing(401).items(7)).rejects.toEqual(new KitchenowlError('unauthorized'));
  await expect(failing(404).items(7)).rejects.toEqual(new KitchenowlError('not-found'));
  await expect(failing(500).items(7)).rejects.toEqual(new KitchenowlError('refused'));
  await expect(failing(200).items(7)).rejects.toEqual(new KitchenowlError('refused'));
});
