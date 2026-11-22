// Runs one cycle of the bridge for a space (docs/kitchenowl.md#one-cycle):
// reads the KitchenOwl list, works out the plan, sends the requests one by one
// and writes what went through into the space. Every write is one atomic step
// on the records as stored at that moment, so a person's change or a sync
// cycle in between is not overwritten.
import { DEFAULT_PRIORITY, newEntryCategory, type Entry } from '@emptio/engine';
import { localChange } from '@nexumia-de/hospes';
import { valueFor, type ListDeps } from '../list/actions';
import { LIST, entriesOf, isEntryValue } from '../list/model';
import {
  KitchenowlError,
  createKitchenowlClient,
  type Fetch,
  type KitchenowlClient,
  type KitchenowlFailure,
} from './client';
import { KITCHENOWL, configOf, linkKey, linksOf, type Link } from './config';
import { planCycle, type EntryStep } from './plan';

export interface BridgeDeps extends ListDeps {
  fetch: Fetch;
}

export type BridgeResult =
  | { state: 'off' }
  | { state: 'synced'; changed: boolean }
  | { state: 'failed'; failure: KitchenowlFailure; changed: boolean };

const failureOf = (error: unknown): KitchenowlFailure =>
  error instanceof KitchenowlError ? error.failure : 'refused';

function applyStep(step: EntryStep, entries: Entry[], now: string): Entry | null {
  const entry = entries.find((e) => e.id === step.id);
  if (step.kind === 'import') {
    return {
      id: step.id,
      name: step.name,
      categoryId: newEntryCategory({ name: step.name, earlier: entries }),
      priority: DEFAULT_PRIORITY,
      ...(step.amount.trim() === '' ? {} : { amount: step.amount.trim() }),
      addedAt: now,
      origins: [{ kind: 'typed' }],
    };
  }
  if (entry === undefined) return null;
  if (step.kind === 'tick') {
    return entry.bought === undefined ? { ...entry, bought: { at: now } } : null;
  }
  if ((entry.amount ?? '') !== step.from) return null;
  const { amount: _amount, ...rest } = entry;
  void _amount;
  return step.to.trim() === '' ? rest : { ...rest, amount: step.to.trim() };
}

async function writeEntries(deps: ListDeps, spaceId: string, steps: EntryStep[]): Promise<boolean> {
  if (steps.length === 0) return false;
  let changed = false;
  await localChange(deps.store, spaceId, LIST, deps.now, (records) => {
    const entries = entriesOf(records);
    const keys = new Set(records.map((r) => r.key));
    const now = deps.now();
    const put: { key: string; value: unknown }[] = [];
    for (const step of steps) {
      // An imported id that exists in any form was made by another device, or removed since.
      if (step.kind === 'import' && keys.has(step.id)) continue;
      const next = applyStep(step, entries, now);
      if (next === null) continue;
      const stored = records.find((r) => r.key === next.id && r.deleted !== true)?.value;
      if (step.kind !== 'import' && !isEntryValue(stored)) continue;
      put.push({ key: next.id, value: valueFor(next, stored) });
      const at = entries.findIndex((e) => e.id === next.id);
      if (at === -1) entries.push(next);
      else entries[at] = next;
    }
    changed = put.length > 0;
    return { put };
  });
  return changed;
}

async function writeLinks(
  deps: ListDeps,
  spaceId: string,
  listId: number,
  link: Link[],
  unlink: number[],
): Promise<boolean> {
  if (link.length === 0 && unlink.length === 0) return false;
  let changed = false;
  await localChange(deps.store, spaceId, KITCHENOWL, deps.now, (records) => {
    // Disconnected or connected to another list meanwhile: these links are of the old one.
    if (configOf(records)?.listId !== listId) return {};
    const current = linksOf(records);
    const put = link
      .filter((l) => {
        const had = current.get(l.itemId);
        return had?.entryId !== l.entryId || had.description !== l.description;
      })
      .map(({ itemId, entryId, description }) => ({
        key: linkKey(itemId),
        value: { entryId, description },
      }));
    const remove = unlink.filter((id) => current.has(id)).map(linkKey);
    changed = put.length > 0 || remove.length > 0;
    return { put, remove };
  });
  return changed;
}

/** One cycle for the space. Never rejects for a failure of KitchenOwl; says it instead. */
export async function bridgeCycle(
  deps: BridgeDeps,
  spaceId: string,
  client?: KitchenowlClient,
): Promise<BridgeResult> {
  const config = configOf((await deps.store.readCollection(spaceId, KITCHENOWL)).records);
  if (config === undefined) return { state: 'off' };
  const kitchenowl = client ?? createKitchenowlClient({ ...config, fetch: deps.fetch });

  let items;
  try {
    items = await kitchenowl.items(config.listId);
  } catch (error) {
    return { state: 'failed', failure: failureOf(error), changed: false };
  }

  const listRecords = (await deps.store.readCollection(spaceId, LIST)).records;
  const plan = planCycle({
    listId: config.listId,
    entries: entriesOf(listRecords),
    keys: new Set(listRecords.map((r) => r.key)),
    links: linksOf((await deps.store.readCollection(spaceId, KITCHENOWL)).records),
    items,
  });

  const link = [...plan.link];
  const unlink = [...plan.unlink];
  let failure: KitchenowlFailure | undefined;
  for (const step of plan.remote) {
    try {
      if (step.kind === 'remove') {
        await kitchenowl.remove(config.listId, step.itemId, Date.parse(deps.now()));
        unlink.push(step.itemId);
      } else if (step.kind === 'describe') {
        await kitchenowl.describe(config.listId, step.itemId, step.description);
        link.push({ itemId: step.itemId, entryId: step.entryId, description: step.description });
      } else {
        const itemId = await kitchenowl.add(config.listId, step.name, step.description);
        link.push({ itemId, entryId: step.entryId, description: step.description });
      }
    } catch (error) {
      // The rest waits for the next cycle; what went through is kept.
      failure = failureOf(error);
      break;
    }
  }

  const entriesChanged = await writeEntries(deps, spaceId, plan.entries);
  const linksChanged = await writeLinks(deps, spaceId, config.listId, link, unlink);
  const changed = entriesChanged || linksChanged;
  return failure === undefined
    ? { state: 'synced', changed }
    : { state: 'failed', failure, changed };
}

/** Whether the space is connected to KitchenOwl, and to which list. */
export async function kitchenowlOf(
  deps: Pick<ListDeps, 'store'>,
  spaceId: string,
): Promise<ReturnType<typeof configOf>> {
  return configOf((await deps.store.readCollection(spaceId, KITCHENOWL)).records);
}
