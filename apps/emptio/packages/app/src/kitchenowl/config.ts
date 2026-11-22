// What a space keeps about its KitchenOwl list (docs/kitchenowl.md): the
// connection, one record, and a link per KitchenOwl item that says which entry
// it is and which description both sides last agreed on. All of it lives in
// the collection `kitchenowl` of the space, so every device of the household
// keeps the list in step once one person connected it.
import { localChange } from '@nexumia-de/hospes';
import type { ListDeps } from '../list/actions';
import { KITCHENOWL, type StoredRecord } from '../list/model';

export { KITCHENOWL };
/** The key of the connection record. */
export const CONFIG_KEY = 'config';
const LINK_PREFIX = 'item:';

export interface KitchenowlConfig {
  /** The address of the instance, without a trailing slash, e.g. `https://kitchenowl.example.org`. */
  url: string;
  /** A long-lived token of KitchenOwl. */
  token: string;
  householdId: number;
  listId: number;
  /** The names, only to show what is connected. */
  householdName?: string;
  listName?: string;
}

/** Which entry a KitchenOwl item is, and the description both sides had at the last cycle. */
export interface Link {
  itemId: number;
  entryId: string;
  description: string;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;
const isText = (value: unknown): value is string => typeof value === 'string';

/**
 * The address as typed, made comparable: `https` or `http`, no path ending in `/`, no `/api`.
 * @returns null when it is no web address.
 */
export function instanceUrl(typed: string): string | null {
  let url: URL;
  try {
    url = new URL(typed.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username !== '' || url.password !== '') return null;
  const path = url.pathname.replace(/\/+$/, '').replace(/\/api$/, '');
  return `${url.origin}${path}`;
}

export function isConfigValue(value: unknown): value is KitchenowlConfig {
  return (
    isObject(value) &&
    isText(value['url']) &&
    instanceUrl(value['url']) === value['url'] &&
    isText(value['token']) &&
    value['token'] !== '' &&
    isId(value['householdId']) &&
    isId(value['listId'])
  );
}

/** The connection among the records of the collection, if there is a valid one. */
export function configOf(records: readonly StoredRecord[]): KitchenowlConfig | undefined {
  const record = records.find((r) => r.key === CONFIG_KEY && r.deleted !== true);
  return record !== undefined && isConfigValue(record.value) ? record.value : undefined;
}

export const linkKey = (itemId: number): string => `${LINK_PREFIX}${itemId}`;

/** The links among the records of the collection, by KitchenOwl item id. */
export function linksOf(records: readonly StoredRecord[]): Map<number, Link> {
  const links = new Map<number, Link>();
  for (const record of records) {
    if (record.deleted === true || !record.key.startsWith(LINK_PREFIX)) continue;
    const itemId = Number(record.key.slice(LINK_PREFIX.length));
    const value = record.value;
    if (!isId(itemId) || !isObject(value)) continue;
    if (!isText(value['entryId']) || !isText(value['description'])) continue;
    links.set(itemId, { itemId, entryId: value['entryId'], description: value['description'] });
  }
  return links;
}

/**
 * Connects the space to a KitchenOwl list. The links of an earlier connection are removed, so
 * the new list starts from what both sides have.
 */
export async function connectKitchenowl(
  deps: ListDeps,
  spaceId: string,
  config: KitchenowlConfig,
): Promise<void> {
  await localChange(deps.store, spaceId, KITCHENOWL, deps.now, (records) => ({
    put: [{ key: CONFIG_KEY, value: { ...config } }],
    remove: records.filter((r) => r.key.startsWith(LINK_PREFIX)).map((r) => r.key),
  }));
}

/** Ends the connection; the list in Emptio stays as it is. */
export async function disconnectKitchenowl(deps: ListDeps, spaceId: string): Promise<void> {
  await localChange(deps.store, spaceId, KITCHENOWL, deps.now, (records) => ({
    remove: records
      .filter((r) => r.key === CONFIG_KEY || r.key.startsWith(LINK_PREFIX))
      .map((r) => r.key),
  }));
}
