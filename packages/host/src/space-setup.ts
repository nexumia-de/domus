// Making a space, as the Household app and the native apps both do it: the name, the addresses a
// storage accepts, what to say about a GitHub repository once it was looked at, and the creation
// itself (secret, id, the space stored, its name written, one cycle). See
// docs/spaces.md#making-a-space.
//
// The collection `space` holds one record, `name`: the space's name. It makes a space real (a file
// in the storage, read back by the next device) and is the end-to-end test of a connection.
import type { StorageAdapter } from '@nexumia-de/materia';
import { localChange, syncCollection, type CycleFailure } from './cycle';
import type { GithubConnectionResult, GithubConnectionState } from './github-connection';
import { deriveSpace, newSecret, type RandomBytes } from './space';
import type { Store, StoredSpace, StoredStorage } from './store';

export const SPACE_COLLECTION = 'space';
export const SPACE_NAME_KEY = 'name';
export const SPACE_NAME_MAX = 60;

/** A space's name as stored: trimmed, one to 60 characters; undefined when it is empty or too long. */
export function cleanSpaceName(text: string): string | undefined {
  const name = text.trim().replace(/\s+/g, ' ');
  return name.length >= 1 && name.length <= SPACE_NAME_MAX ? name : undefined;
}

const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** `owner/name` of a GitHub repository, as the adapter wants it. */
export const isRepository = (text: string): boolean =>
  REPOSITORY.test(text) && !text.split('/').some((part) => part === '.' || part === '..');

/**
 * A WebDAV address the adapter accepts: https, a host, no user name or password in it. Read by
 * hand, without `URL`, which GJS lacks.
 */
export function isWebdavAddress(text: string): boolean {
  const match = /^https:\/\/([^/?#\s]+)([/?#]\S*)?$/i.exec(text.trim());
  const authority = match?.[1];
  return (
    authority !== undefined && !authority.includes('@') && /^[^:]+(:\d{1,5})?$/.test(authority)
  );
}

/** What a look at a GitHub repository means for using it as a space's storage. */
export type GithubVerdict =
  | { kind: 'ok' }
  /** Works, but the repository is public: the files are encrypted, their existence is not secret. */
  | { kind: 'public' }
  /** The token cannot write: blocked. */
  | { kind: 'readonly' }
  | { kind: 'failed'; failure: Exclude<GithubConnectionState, 'reachable'>; detail?: string };

export function githubVerdict(test: GithubConnectionResult): GithubVerdict {
  if (test.state !== 'reachable') {
    return test.detail === undefined
      ? { kind: 'failed', failure: test.state }
      : { kind: 'failed', failure: test.state, detail: test.detail };
  }
  if (!test.canWrite) return { kind: 'readonly' };
  return test.private ? { kind: 'ok' } : { kind: 'public' };
}

export interface CreateSpaceDeps {
  store: Store;
  /** `YYYY-MM-DDThh:mm:ss.fffZ` */
  now: () => string;
  random?: RandomBytes;
  /** May throw (RangeError, UnknownStorage) for a storage it cannot use. */
  adapter: (storage: StoredStorage) => StorageAdapter;
}

export type CreateSpaceResult =
  | { ok: true; id: string; name: string }
  | { ok: false; failure: CycleFailure | 'bad-name'; detail?: string };

/**
 * A new space: secret, id, the space on this device, its name written in `space`, one cycle.
 * When the cycle fails the space is taken off the device again, so the person can fix the cause
 * and start over. Anything thrown (a storage the host cannot use, a store that fails) is thrown
 * on, after the space was taken off again.
 */
export async function createSpace(
  input: { name: string; storage: StoredStorage },
  deps: CreateSpaceDeps,
): Promise<CreateSpaceResult> {
  const name = cleanSpaceName(input.name);
  if (name === undefined) return { ok: false, failure: 'bad-name' };
  let id: string | undefined;
  try {
    const secret = newSecret(deps.random);
    const derived = await deriveSpace(secret);
    id = derived.id;
    const space: StoredSpace = { id, secret, name, storage: input.storage };
    await deps.store.putSpace(space);
    await localChange(deps.store, id, SPACE_COLLECTION, deps.now, () => ({
      put: [{ key: SPACE_NAME_KEY, value: name }],
    }));
    const result = await syncCollection({
      space: derived,
      collection: SPACE_COLLECTION,
      adapter: deps.adapter(space.storage),
      store: deps.store,
      now: deps.now,
    });
    if (!result.ok) {
      await deps.store.removeSpace(id);
      return result.detail === undefined
        ? { ok: false, failure: result.failure }
        : { ok: false, failure: result.failure, detail: result.detail };
    }
    return { ok: true, id, name };
  } catch (error) {
    if (id !== undefined) await deps.store.removeSpace(id).catch(() => undefined);
    throw error;
  }
}
