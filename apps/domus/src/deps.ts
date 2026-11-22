// The real effects the screens give to src/logic/actions.ts. The GitHub address is the build's
// constant (env.ts); it is passed to every call that reaches GitHub, so a token goes to that
// host and to no other.
import {
  adapterFor,
  createIdbStore,
  findRepositories,
  testGithub,
  type Store,
} from '@nexumia-de/hospes';
import type { Deps } from './logic/actions';
import { GITHUB_API } from './env';

let store: (Store & { close(): void }) | undefined;

/** One store for the page; the database opens on first use. */
export const pageStore = (): Store => (store ??= createIdbStore());

export function realDeps(): Deps {
  return {
    store: pageStore(),
    now: () => new Date().toISOString(),
    adapter: (storage) => adapterFor(storage, { apiBase: GITHUB_API }),
    findRepositories: (token) => findRepositories(token, { apiBase: GITHUB_API }),
    testGithub: (repository, token) => testGithub({ repository, token, apiBase: GITHUB_API }),
  };
}
