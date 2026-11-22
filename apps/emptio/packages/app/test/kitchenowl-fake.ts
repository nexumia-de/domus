// A KitchenOwl list in memory that behaves as the backend's source says
// (docs/kitchenowl.md#the-api): items are named once per household, a list
// holds an item at most once, adding a name already on the list changes
// nothing, removing what is not there is no error. Not proven by it: the real
// server, its HTTP, its timestamps.
import {
  KitchenowlError,
  type Fetch,
  type KitchenowlClient,
  type RemoteItem,
} from '../src/kitchenowl/client';

export function fakeKitchenowl(listId = 7) {
  const itemIds = new Map<string, number>();
  const onList = new Map<number, { name: string; description: string; createdAt: string }>();
  const state = { down: false, requests: 0, puttings: 0 };
  let nextItem = 100;

  const check = (id: number): void => {
    state.requests += 1;
    if (state.down) throw new KitchenowlError('unreachable');
    if (id !== listId) throw new KitchenowlError('not-found');
  };

  /** What a person does in KitchenOwl's app. */
  const person = {
    add(name: string, description = ''): number {
      const key = name.toLowerCase();
      const itemId = itemIds.get(key) ?? nextItem++;
      itemIds.set(key, itemId);
      if (!onList.has(itemId)) {
        state.puttings += 1;
        onList.set(itemId, { name, description, createdAt: `t${state.puttings}` });
      }
      return itemId;
    },
    tick(name: string): void {
      const itemId = itemIds.get(name.toLowerCase());
      if (itemId !== undefined) onList.delete(itemId);
    },
    describe(name: string, description: string): void {
      const item = onList.get(itemIds.get(name.toLowerCase()) ?? -1);
      if (item) item.description = description;
    },
    list(): { name: string; description: string }[] {
      return [...onList.values()]
        .map(({ name, description }) => ({ name, description }))
        .sort((a, b) => (a.name < b.name ? -1 : 1));
    },
  };

  const client: KitchenowlClient = {
    households: () => Promise.resolve([{ id: 1, name: 'Home' }]),
    lists: () => Promise.resolve([{ id: listId, name: 'Groceries' }]),
    items(id) {
      check(id);
      const items: RemoteItem[] = [...onList].map(([itemId, item]) => ({ itemId, ...item }));
      return Promise.resolve(items);
    },
    add(id, name, description) {
      check(id);
      return Promise.resolve(person.add(name, description));
    },
    describe(id, itemId, description) {
      check(id);
      const item = onList.get(itemId);
      if (item) item.description = description;
      return Promise.resolve();
    },
    remove(id, itemId) {
      check(id);
      onList.delete(itemId);
      return Promise.resolve();
    },
  };

  return { client, person, state };
}

/** The fake behind HTTP, as the client calls it: the routes of KitchenOwl's API. */
export function fakeFetch(client: KitchenowlClient, token = 'llt'): Fetch {
  return async (url, init) => {
    const answer = (status: number, body: unknown = {}) => ({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
    if (init.headers['Authorization'] !== `Bearer ${token}`) return answer(401);
    const path = new URL(url).pathname.replace(/^\/api/, '');
    const body = (init.body === undefined ? {} : JSON.parse(init.body)) as {
      name?: string;
      description?: string;
      item_id?: number;
      removed_at?: number;
    };
    try {
      let m: RegExpMatchArray | null;
      if ((m = path.match(/^\/shoppinglist\/(\d+)\/items$/)) && init.method === 'GET') {
        const items = await client.items(Number(m[1]));
        return answer(
          200,
          items.map((i) => ({
            id: i.itemId,
            name: i.name,
            description: i.description,
            created_at: i.createdAt,
          })),
        );
      }
      if ((m = path.match(/^\/shoppinglist\/(\d+)\/add-item-by-name$/))) {
        const id = await client.add(Number(m[1]), body.name ?? '', body.description ?? '');
        return answer(200, { id, name: body.name });
      }
      if ((m = path.match(/^\/shoppinglist\/(\d+)\/item\/(\d+)$/))) {
        await client.describe(Number(m[1]), Number(m[2]), body.description ?? '');
        return answer(200);
      }
      if ((m = path.match(/^\/shoppinglist\/(\d+)\/item$/)) && init.method === 'DELETE') {
        await client.remove(Number(m[1]), body.item_id ?? 0, body.removed_at ?? 0);
        return answer(200, { msg: 'DONE' });
      }
      return answer(404);
    } catch (error) {
      if (error instanceof KitchenowlError && error.failure === 'unreachable')
        throw new TypeError('Failed to fetch', { cause: error });
      return answer(404);
    }
  };
}
