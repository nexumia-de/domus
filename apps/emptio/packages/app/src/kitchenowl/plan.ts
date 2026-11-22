// One cycle of the bridge worked out without doing it
// (docs/kitchenowl.md#one-cycle): from the entries, the links and the items on
// the KitchenOwl list, what to send to KitchenOwl and what to change in the
// space. Pure: no clock, no requests; the runner does both.
import { sortKey, type Entry } from '@emptio/engine';
import type { RemoteItem } from './client';
import type { Link } from './config';

/** A request to KitchenOwl, with the link to keep once it went through. */
export type RemoteStep =
  | { kind: 'remove'; itemId: number }
  | { kind: 'describe'; itemId: number; entryId: string; description: string }
  | { kind: 'add'; entryId: string; name: string; description: string };

/** A change of the list in the space, applied to the entry as it is stored then. */
export type EntryStep =
  /** KitchenOwl took it off its list: ticked, unless it was ticked already. */
  | { kind: 'tick'; id: string }
  /** KitchenOwl changed the description: the amount, unless the amount changed meanwhile. */
  | { kind: 'amount'; id: string; from: string; to: string }
  /** Put on the KitchenOwl list and not in Emptio yet. */
  | { kind: 'import'; id: string; name: string; amount: string };

export interface Plan {
  remote: RemoteStep[];
  entries: EntryStep[];
  /** Links to write at once (no request needed). */
  link: Link[];
  /** Item ids whose link goes at once. */
  unlink: number[];
}

export interface PlanInput {
  listId: number;
  /** The live entries of the space. */
  entries: readonly Entry[];
  /** Every key of the list collection, removed ones too: an imported id is never used twice. */
  keys: ReadonlySet<string>;
  links: ReadonlyMap<number, Link>;
  items: readonly RemoteItem[];
}

const amountOf = (entry: Entry): string => entry.amount ?? '';

/**
 * The id of the entry an item becomes: the same on every device, so two devices that import
 * the same putting of an item make one entry, and a new putting makes a new one.
 */
export function importedId(listId: number, item: RemoteItem): string {
  const when = item.createdAt.replace(/[^0-9A-Za-z]+/g, '');
  return `kitchenowl-${listId}-${item.itemId}-${when}`;
}

export function planCycle(input: PlanInput): Plan {
  const plan: Plan = { remote: [], entries: [], link: [], unlink: [] };
  const byId = new Map(input.entries.map((entry) => [entry.id, entry]));
  const items = new Map(input.items.map((item) => [item.itemId, item]));
  /** Entries this cycle settled: linked to an item, or ticked because KitchenOwl took it off. */
  const linked = new Set<string>();
  /** Items that are an entry after this cycle, by the sort key of their name. */
  const taken = new Set<string>();

  for (const link of input.links.values()) {
    const item = items.get(link.itemId);
    const entry = byId.get(link.entryId);
    if (item === undefined) {
      // Taken off the KitchenOwl list: bought there.
      if (entry !== undefined && entry.bought === undefined) {
        plan.entries.push({ kind: 'tick', id: entry.id });
        linked.add(entry.id);
      }
      plan.unlink.push(link.itemId);
      continue;
    }
    if (entry === undefined || entry.bought !== undefined) {
      // Ticked or removed in Emptio.
      plan.remote.push({ kind: 'remove', itemId: link.itemId });
      continue;
    }
    if (sortKey(entry.name) !== sortKey(item.name)) {
      // Renamed in Emptio: KitchenOwl names an item, not a putting, so it is another item.
      plan.remote.push({ kind: 'remove', itemId: link.itemId });
      continue;
    }
    linked.add(entry.id);
    taken.add(sortKey(item.name));
    const here = amountOf(entry);
    const there = item.description;
    if (here === there) {
      if (link.description !== there) plan.link.push({ ...link, description: there });
    } else if (here === link.description) {
      plan.entries.push({ kind: 'amount', id: entry.id, from: here, to: there });
      plan.link.push({ ...link, description: there });
    } else {
      // Changed in Emptio, or on both sides: Emptio's wins.
      plan.remote.push({
        kind: 'describe',
        itemId: link.itemId,
        entryId: entry.id,
        description: here,
      });
    }
  }

  const unlinked = (): Map<string, Entry> => {
    const open = new Map<string, Entry>();
    for (const entry of input.entries) {
      if (entry.bought !== undefined || linked.has(entry.id)) continue;
      const key = sortKey(entry.name);
      if (!open.has(key)) open.set(key, entry);
    }
    return open;
  };
  const open = unlinked();

  for (const item of input.items) {
    if (input.links.has(item.itemId)) continue;
    const key = sortKey(item.name);
    const entry = open.get(key);
    if (entry !== undefined) {
      // On both lists already: one thing.
      open.delete(key);
      linked.add(entry.id);
      taken.add(key);
      const here = amountOf(entry);
      if (here === item.description) {
        plan.link.push({ itemId: item.itemId, entryId: entry.id, description: here });
      } else if (here === '') {
        plan.entries.push({ kind: 'amount', id: entry.id, from: '', to: item.description });
        plan.link.push({ itemId: item.itemId, entryId: entry.id, description: item.description });
      } else {
        plan.remote.push({
          kind: 'describe',
          itemId: item.itemId,
          entryId: entry.id,
          description: here,
        });
      }
      continue;
    }
    const id = importedId(input.listId, item);
    if (input.keys.has(id)) {
      // This putting was an entry and was ticked away or removed before its link was written.
      plan.remote.push({ kind: 'remove', itemId: item.itemId });
      continue;
    }
    taken.add(key);
    plan.entries.push({ kind: 'import', id, name: item.name.trim(), amount: item.description });
    plan.link.push({ itemId: item.itemId, entryId: id, description: item.description });
  }

  for (const [key, entry] of open) {
    if (taken.has(key)) continue;
    plan.remote.push({
      kind: 'add',
      entryId: entry.id,
      name: entry.name,
      description: amountOf(entry),
    });
  }

  // Removals first: a renamed entry leaves its old item before it is added under the new name.
  const order = { remove: 0, describe: 1, add: 2 } as const;
  plan.remote.sort((a, b) => order[a.kind] - order[b.kind]);
  return plan;
}
