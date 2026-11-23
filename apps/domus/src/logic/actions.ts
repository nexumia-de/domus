// What the screens do, one function each, with every effect passed in: the store, the clock,
// the randomness, the storage adapter and the two GitHub calls. The screens give them the real
// ones (src/deps.ts); the tests give a memory store and fakes.
//
// The one collection this app keeps is `space`, with the record `name`: the space's name. It
// makes a space real (a file in the storage, read back by the next device) and is the end-to-end
// test of a connection. The apps add their own collections and sync them themselves.
//
// A space on this device only (`isDeviceOnly`, made by an app before sync was set up) has no
// storage: no cycle is run for it, here or anywhere, until `connectStorage` gave it one.
import {
  SPACE_COLLECTION,
  SPACE_NAME_KEY,
  createSpace as createHostSpace,
  deriveSpace,
  deviceOnlyStorage,
  isDeviceOnly,
  localChange,
  syncCollection,
  testConnection,
  type FindRepositoriesResult,
  type GithubConnectionResult,
  type RandomBytes,
  type Store,
  type StoredSpace,
  type StoredStorage,
} from '@nexumia-de/hospes';
import type { StorageAdapter } from '@nexumia-de/materia';
import { problemOf, type Problem } from './failures';
import { verdictOf } from './github-setup';
import { cleanName } from './names';

export { SPACE_COLLECTION as COLLECTION, SPACE_NAME_KEY as NAME_KEY } from '@nexumia-de/hospes';
const COLLECTION = SPACE_COLLECTION;
const NAME_KEY = SPACE_NAME_KEY;

export interface Deps {
  store: Store;
  /** `YYYY-MM-DDThh:mm:ss.fffZ` */
  now: () => string;
  random?: RandomBytes;
  /** May throw (RangeError, UnknownStorage) for a storage it cannot use. */
  adapter: (storage: StoredStorage) => StorageAdapter;
  findRepositories: (token: string) => Promise<FindRepositoriesResult>;
  testGithub: (repository: string, token: string) => Promise<GithubConnectionResult>;
}

export type Outcome =
  { ok: true; name: string | undefined; wrote: boolean } | ({ ok: false } & Problem);

const toProblem = (r: Problem): Problem =>
  r.detail === undefined ? { failure: r.failure } : { failure: r.failure, detail: r.detail };

const fail = (problem: Problem): { ok: false } & Problem => ({ ok: false, ...problem });

/** The name the collection holds, if it holds a usable one. */
export async function nameInCollection(store: Store, id: string): Promise<string | undefined> {
  const state = await store.readCollection(id, COLLECTION);
  const record = state.records.find((r) => r.key === NAME_KEY && r.deleted !== true);
  return typeof record?.value === 'string' ? cleanName(record.value) : undefined;
}

/**
 * One cycle on the `space` collection, then the stored name follows the collection: the name
 * another device wrote becomes this device's name.
 */
export async function syncSpace(space: StoredSpace, deps: Deps): Promise<Outcome> {
  try {
    const derived = await deriveSpace(space.secret);
    const result = await syncCollection({
      space: derived,
      collection: COLLECTION,
      adapter: deps.adapter(space.storage),
      store: deps.store,
      now: deps.now,
    });
    if (!result.ok) return fail(toProblem(result));
    const name = await nameInCollection(deps.store, space.id);
    if (name !== undefined && name !== space.name) {
      const current = await deps.store.getSpace(space.id);
      if (current) await deps.store.putSpace({ ...current, name });
    }
    return { ok: true, name, wrote: result.wrote };
  } catch (error) {
    return fail(problemOf(error));
  }
}

/** Looks at the storage before anything is stored: GitHub's repository, a WebDAV probe. */
export async function checkStorage(
  storage: StoredStorage,
  deps: Deps,
): Promise<{ ok: true; public: boolean } | ({ ok: false; readonly?: true } & Partial<Problem>)> {
  try {
    if (isDeviceOnly({ storage })) return { ok: false, failure: 'bad-storage' };
    if (storage.type === 'github') {
      const verdict = verdictOf(
        await deps.testGithub(storage.address, storage.access?.token ?? ''),
      );
      if (verdict.kind === 'failed') return { ok: false, ...verdict.problem };
      if (verdict.kind === 'readonly') return { ok: false, readonly: true };
      return { ok: true, public: verdict.kind === 'public' };
    }
    const result = await testConnection(deps.adapter(storage));
    if (result.state !== 'reachable') {
      const failure = result.state;
      return {
        ok: false,
        failure,
        ...(result.detail === undefined ? {} : { detail: result.detail }),
      };
    }
    return { ok: true, public: false };
  } catch (error) {
    return { ok: false, ...problemOf(error) };
  }
}

export type CreateResult = { ok: true; id: string } | ({ ok: false } & Problem);

/**
 * A new space: secret, id, the space on this device, its name written, one cycle (the host
 * package's `createSpace`, which the native apps use too). When the cycle fails the space is
 * taken off the device again, so the person can fix the cause and start over; nothing was
 * written to the storage that is not also in the cycle's failure.
 */
export async function createSpace(
  input: { name: string; storage: StoredStorage },
  deps: Deps,
): Promise<CreateResult> {
  const name = cleanName(input.name);
  if (name === undefined) return fail({ failure: 'unexpected' });
  try {
    const created = await createHostSpace({ name, storage: input.storage }, deps);
    if (created.ok) return { ok: true, id: created.id };
    if (created.failure === 'bad-name') return fail({ failure: 'unexpected' });
    return fail(
      created.detail === undefined
        ? { failure: created.failure }
        : { failure: created.failure, detail: created.detail },
    );
  } catch (error) {
    return fail(problemOf(error));
  }
}

export type JoinResult =
  | { ok: true; id: string; name: string | undefined; found: boolean }
  | { ok: false; alreadyHere: true; id: string }
  | ({ ok: false; readonly?: true; alreadyHere?: undefined } & Partial<Problem>);

/**
 * Joins a space from an invite and the access (the invite's own or the one the person entered):
 * looks at the storage, stores the space, runs a cycle that reads the name the other device
 * wrote. A space that is already here is not touched. When the cycle fails the space is taken
 * off again.
 */
export async function joinSpace(
  invite: { secret: string; name?: string; storage: { type: string; address: string } },
  access: Record<string, string> | undefined,
  deps: Deps,
): Promise<JoinResult> {
  let id: string | undefined;
  let stored = false;
  try {
    id = (await deriveSpace(invite.secret)).id;
    if (await deps.store.getSpace(id)) return { ok: false, alreadyHere: true, id };
    const storage: StoredStorage = {
      type: invite.storage.type,
      address: invite.storage.address,
      ...(access && Object.keys(access).length > 0 ? { access } : {}),
    };
    const check = await checkStorage(storage, deps);
    if (!check.ok) return check;
    const space: StoredSpace = {
      id,
      secret: invite.secret,
      ...(invite.name === undefined ? {} : { name: invite.name }),
      storage,
    };
    await deps.store.putSpace(space);
    stored = true;
    const outcome = await syncSpace(space, deps);
    if (!outcome.ok) {
      await deps.store.removeSpace(id);
      return outcome;
    }
    return { ok: true, id, name: outcome.name ?? invite.name, found: outcome.name !== undefined };
  } catch (error) {
    if (stored && id !== undefined) await deps.store.removeSpace(id).catch(() => undefined);
    return fail(problemOf(error));
  }
}

/**
 * A new name for a space: kept here at once, written with the next cycle (run now). The
 * rename is never lost to a failed cycle; the outcome says whether it reached the storage.
 * A space on this device only has no cycle and so no outcome; its name waits in the collection
 * for the day a storage is connected.
 */
export async function renameSpace(
  id: string,
  text: string,
  deps: Deps,
): Promise<{ saved: boolean; outcome?: Outcome }> {
  const name = cleanName(text);
  const space = await deps.store.getSpace(id);
  if (name === undefined || !space) return { saved: false };
  await localChange(deps.store, id, COLLECTION, deps.now, () => ({
    put: [{ key: NAME_KEY, value: name }],
  }));
  await deps.store.putSpace({ ...space, name });
  if (isDeviceOnly(space)) return { saved: true };
  return { saved: true, outcome: await syncSpace({ ...space, name }, deps) };
}

/**
 * New access for the storage of a space (an expired token, a new password): looked at first,
 * stored only when it works, then a cycle.
 */
export async function changeAccess(
  id: string,
  access: Record<string, string>,
  deps: Deps,
): Promise<{ ok: true; outcome: Outcome } | ({ ok: false; readonly?: true } & Partial<Problem>)> {
  const space = await deps.store.getSpace(id);
  if (!space) return { ok: false, failure: 'unexpected' };
  const next: StoredSpace = { ...space, storage: { ...space.storage, access } };
  const check = await checkStorage(next.storage, deps);
  if (!check.ok) return check;
  await deps.store.putSpace(next);
  return { ok: true, outcome: await syncSpace(next, deps) };
}

export type ConnectResult =
  { ok: true; outcome: Outcome } | ({ ok: false; readonly?: true } & Partial<Problem>);

/**
 * A storage for a space that was on this device only: looked at first, then the space is stored
 * with it, the `space` collection is made to hold the name, and one cycle runs on it. The id and
 * the secret stay; what the apps keep in the space is sent by the apps when they are opened.
 * When the cycle fails the space goes back to this device only: nothing of it is removed, and
 * the person can fix the cause and try again. A space that already has a storage is not touched.
 */
export async function connectStorage(
  id: string,
  storage: StoredStorage,
  deps: Deps,
): Promise<ConnectResult> {
  let connected = false;
  const backToDevice = async (): Promise<void> => {
    const current = await deps.store.getSpace(id);
    if (current) await deps.store.putSpace({ ...current, storage: deviceOnlyStorage() });
  };
  try {
    const space = await deps.store.getSpace(id);
    if (!space || !isDeviceOnly(space)) return { ok: false, failure: 'unexpected' };
    const check = await checkStorage(storage, deps);
    if (!check.ok) return check;
    const next: StoredSpace = { ...space, storage };
    await deps.store.putSpace(next);
    connected = true;
    const name = cleanName(space.name ?? '');
    if (name !== undefined && (await nameInCollection(deps.store, id)) === undefined) {
      await localChange(deps.store, id, COLLECTION, deps.now, () => ({
        put: [{ key: NAME_KEY, value: name }],
      }));
    }
    const outcome = await syncSpace(next, deps);
    if (!outcome.ok) {
      await backToDevice();
      return outcome;
    }
    return { ok: true, outcome };
  } catch (error) {
    if (connected) await backToDevice().catch(() => undefined);
    return fail(problemOf(error));
  }
}
