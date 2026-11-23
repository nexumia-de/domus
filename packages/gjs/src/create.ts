// Creating a space from the native apps' form: the name, a GitHub repository with a token or a
// WebDAV folder with its sign-in. The rules and the creation are the host package's (the same
// `createSpace` as the Household app's); this file reads the form, looks at a GitHub repository
// first, as the Household app does, and says what went wrong in one short name. Pure: no
// `gi://`, so Node tests import it.
import {
  UnknownStorage,
  cleanSpaceName,
  createSpace,
  githubVerdict,
  isRepository,
  isWebdavAddress,
  type CreateSpaceDeps,
  type GithubConnectionResult,
  type StoredStorage,
} from '@nexumia-de/hospes';

export type StorageKind = 'github' | 'webdav';
export const STORAGE_KINDS: readonly StorageKind[] = ['github', 'webdav'];

export interface CreateForm {
  name: string;
  kind: StorageKind;
  /** GitHub: `owner/name` and a token that may write to it. */
  repository: string;
  token: string;
  /** WebDAV: the folder's https address, and the sign-in when the server wants one. */
  address: string;
  user: string;
  password: string;
}

export interface CreateDeps extends CreateSpaceDeps {
  /** A look at the repository with the token (the host's `testGithub` on the app's `fetch`). */
  testGithub: (repository: string, token: string) => Promise<GithubConnectionResult>;
}

export type CreateError =
  | 'name'
  | 'repository'
  | 'token'
  | 'address'
  /** The token may read the repository but not write to it. */
  | 'readonly'
  /** The repository is public; asked again with `publicAllowed` once the person agreed. */
  | 'public';

export type CreateFromFormResult =
  | { ok: true; id: string; name: string }
  | { ok: false; error: CreateError }
  /** The storage refused or failed; `failure` is a cycle's or GitHub's failure code. */
  | { ok: false; error: 'failed'; failure: string; detail?: string };

/** The storage the form describes, with its access; undefined with the field that is wrong. */
export function storageOfForm(
  form: CreateForm,
): { ok: true; storage: StoredStorage } | { ok: false; error: CreateError } {
  if (form.kind === 'github') {
    const repository = form.repository.trim();
    if (!isRepository(repository)) return { ok: false, error: 'repository' };
    const token = form.token.trim();
    if (token === '') return { ok: false, error: 'token' };
    return { ok: true, storage: { type: 'github', address: repository, access: { token } } };
  }
  const address = form.address.trim();
  if (!isWebdavAddress(address)) return { ok: false, error: 'address' };
  const access: Record<string, string> = {};
  if (form.user.trim() !== '') access['username'] = form.user.trim();
  if (form.password !== '') access['password'] = form.password;
  return {
    ok: true,
    storage: {
      type: 'webdav',
      address,
      ...(Object.keys(access).length > 0 ? { access } : {}),
    },
  };
}

const failed = (failure: string, detail?: string): CreateFromFormResult =>
  detail === undefined
    ? { ok: false, error: 'failed', failure }
    : { ok: false, error: 'failed', failure, detail };

/**
 * Creates a space from the form: the fields are checked, a GitHub repository is looked at (a
 * public one is used only with `publicAllowed`), then the host's `createSpace` stores the space
 * and runs one cycle, which writes the space's first file; when that cycle fails, nothing stays
 * on the device.
 */
export async function createFromForm(
  form: CreateForm,
  deps: CreateDeps,
  options: { publicAllowed: boolean } = { publicAllowed: false },
): Promise<CreateFromFormResult> {
  const name = cleanSpaceName(form.name);
  if (name === undefined) return { ok: false, error: 'name' };
  const chosen = storageOfForm(form);
  if (!chosen.ok) return chosen;
  const { storage } = chosen;
  try {
    if (storage.type === 'github') {
      const verdict = githubVerdict(
        await deps.testGithub(storage.address, storage.access?.['token'] ?? ''),
      );
      if (verdict.kind === 'failed') return failed(verdict.failure, verdict.detail);
      if (verdict.kind === 'readonly') return { ok: false, error: 'readonly' };
      if (verdict.kind === 'public' && !options.publicAllowed)
        return { ok: false, error: 'public' };
    }
    const created = await createSpace({ name, storage }, deps);
    if (created.ok) return created;
    if (created.failure === 'bad-name') return { ok: false, error: 'name' };
    return failed(created.failure, created.detail);
  } catch (error) {
    // A storage the host cannot use (a bad address) or a store that failed.
    return failed(
      error instanceof RangeError || error instanceof UnknownStorage ? 'storage' : 'other',
    );
  }
}
