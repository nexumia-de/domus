// The few requests of KitchenOwl's API that the bridge needs
// (docs/kitchenowl.md#the-api). Read from KitchenOwl's backend source; the
// fetch is injected: the browser's, or libsoup's in the Linux app.

/** The part of `fetch` the client uses. */
export type Fetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Why a request failed, in words the settings can show. */
export type KitchenowlFailure = 'unreachable' | 'unauthorized' | 'not-found' | 'refused';

export class KitchenowlError extends Error {
  constructor(readonly failure: KitchenowlFailure) {
    super(`KitchenOwl: ${failure}`);
    this.name = 'KitchenowlError';
  }
}

export interface RemoteItem {
  itemId: number;
  name: string;
  description: string;
  /** When it was put on the list, as KitchenOwl says it; tells two puttings of one item apart. */
  createdAt: string;
}

export interface Named {
  id: number;
  name: string;
}

export interface KitchenowlClient {
  households(): Promise<Named[]>;
  lists(householdId: number): Promise<Named[]>;
  items(listId: number): Promise<RemoteItem[]>;
  /** Puts an item on the list by name; KitchenOwl makes the item when it has none of that name. */
  add(listId: number, name: string, description: string): Promise<number>;
  describe(listId: number, itemId: number, description: string): Promise<void>;
  /** Takes an item off the list, as ticking does in KitchenOwl. */
  remove(listId: number, itemId: number, removedAtMs: number): Promise<void>;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function named(body: unknown): Named[] {
  if (!Array.isArray(body)) throw new KitchenowlError('refused');
  return body.flatMap((value) =>
    isObject(value) && typeof value['id'] === 'number' && typeof value['name'] === 'string'
      ? [{ id: value['id'], name: value['name'] }]
      : [],
  );
}

function remoteItems(body: unknown): RemoteItem[] {
  if (!Array.isArray(body)) throw new KitchenowlError('refused');
  return body.flatMap((value) => {
    if (!isObject(value) || typeof value['id'] !== 'number') return [];
    if (typeof value['name'] !== 'string') return [];
    const description = typeof value['description'] === 'string' ? value['description'] : '';
    const created = value['created_at'];
    const createdAt = typeof created === 'string' || typeof created === 'number' ? created : '';
    return [{ itemId: value['id'], name: value['name'], description, createdAt: `${createdAt}` }];
  });
}

export function createKitchenowlClient(options: {
  url: string;
  token: string;
  fetch: Fetch;
}): KitchenowlClient {
  const api = `${options.url}/api`;

  async function call(method: string, path: string, body?: unknown): Promise<unknown> {
    let response;
    try {
      response = await options.fetch(`${api}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${options.token}`,
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      // Offline, a wrong address, or in the browser a server that sends no CORS headers.
      throw new KitchenowlError('unreachable');
    }
    if (response.status === 401 || response.status === 403) {
      throw new KitchenowlError('unauthorized');
    }
    if (response.status === 404) throw new KitchenowlError('not-found');
    if (!response.ok) throw new KitchenowlError('refused');
    try {
      return await response.json();
    } catch {
      throw new KitchenowlError('refused');
    }
  }

  return {
    households: async () => named(await call('GET', '/household')),
    lists: async (householdId) =>
      named(await call('GET', `/household/${householdId}/shoppinglist`)),
    items: async (listId) => remoteItems(await call('GET', `/shoppinglist/${listId}/items`)),
    async add(listId, name, description) {
      const body = await call('POST', `/shoppinglist/${listId}/add-item-by-name`, {
        name,
        description,
      });
      if (!isObject(body) || typeof body['id'] !== 'number') throw new KitchenowlError('refused');
      return body['id'];
    },
    async describe(listId, itemId, description) {
      await call('POST', `/shoppinglist/${listId}/item/${itemId}`, { description });
    },
    async remove(listId, itemId, removedAtMs) {
      await call('DELETE', `/shoppinglist/${listId}/item`, {
        item_id: itemId,
        removed_at: removedAtMs,
      });
    },
  };
}
