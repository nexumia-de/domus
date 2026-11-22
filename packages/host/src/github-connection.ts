// "Test Connection" and setup help for the GitHub storage: one look at the
// repository, a list of the repositories a token reaches, and the two links
// of the setup screen. GitHub's behaviour here is as documented and was not
// verified against the live API (docs/github.md).
import { DEFAULT_API_BASE, failureOf, resolve, send, type GithubOptions } from './github-http';

export type GithubConnectionState =
  'reachable' | 'unauthorised' | 'not-found' | 'blocked' | 'unreachable' | 'server';

export type GithubConnectionResult =
  | {
      state: 'reachable';
      /** The repository is private; the setup screen warns when it is not. */
      private: boolean;
      /** The token may write (`permissions.push`); the screen warns when it may not. */
      canWrite: boolean;
      /** `size` is 0, so probably no commit yet (GitHub's size is in KB and may lag). */
      empty: boolean;
    }
  | { state: Exclude<GithubConnectionState, 'reachable'>; detail?: string };

const stateOf = (failure: string): Exclude<GithubConnectionState, 'reachable'> =>
  failure === 'unauthorised' || failure === 'blocked' || failure === 'unreachable'
    ? failure
    : failure === 'not-found'
      ? 'not-found'
      : 'server';

const bad = (failure: string, detail?: string): GithubConnectionResult =>
  detail === undefined ? { state: stateOf(failure) } : { state: stateOf(failure), detail };

/** `GET /repos/{owner}/{repo}`. Throws a RangeError for a bad repository, like the adapter. */
export async function testGithub(options: GithubOptions): Promise<GithubConnectionResult> {
  const r = resolve(options);
  const answer = await send(r, 'GET', `${r.apiBase}${r.repoPath}`);
  if (!(answer instanceof Response)) return bad(answer.failure);
  if (answer.status === 404) return bad('not-found');
  if (answer.status !== 200) {
    const f = failureOf(answer);
    return bad(f.failure, f.detail);
  }
  try {
    const json = (await answer.json()) as {
      private?: unknown;
      size?: unknown;
      permissions?: { push?: unknown };
    };
    return {
      state: 'reachable',
      private: json.private === true,
      canWrite: json.permissions?.push === true,
      empty: json.size === 0,
    };
  } catch {
    return bad('server', 'bad-answer');
  }
}

export interface RepositoryEntry {
  fullName: string;
  private: boolean;
  canWrite: boolean;
}

export type FindRepositoriesResult =
  | {
      ok: true;
      repositories: RepositoryEntry[];
      /** More repositories exist than the 200 listed. */
      more: boolean;
    }
  | { ok: false; failure: 'unauthorised' | 'blocked' | 'unreachable' | 'server'; detail?: string };

/**
 * The repositories the token reaches, so the person need not type the name: one page of 100
 * and at most one `Link: rel="next"` page (200 entries), then `more: true`.
 *
 * NOTE: that this endpoint lists exactly the selected repositories for a fine-grained token
 * limited to selected repositories is GitHub's documented behaviour as far as known; it was
 * not verified against the live API here.
 */
export async function findRepositories(
  token: string,
  options: { fetch?: typeof fetch; apiBase?: string; online?: () => boolean } = {},
): Promise<FindRepositoriesResult> {
  const apiBase = (options.apiBase ?? DEFAULT_API_BASE).replace(/\/+$/, '');
  const r = resolve({ repository: 'x/x', token, apiBase, ...options });
  const repositories: RepositoryEntry[] = [];
  let url: string | undefined =
    `${apiBase}/user/repos?per_page=100&affiliation=owner,collaborator&sort=pushed`;
  for (let page = 0; page < 2 && url !== undefined; page++) {
    const answer = await send(r, 'GET', url);
    if (!(answer instanceof Response)) {
      return {
        ok: false,
        failure:
          answer.failure === 'blocked' || answer.failure === 'unreachable'
            ? answer.failure
            : 'server',
      };
    }
    if (answer.status !== 200) {
      const f = failureOf(answer);
      const failure = f.failure === 'unauthorised' ? 'unauthorised' : 'server';
      return f.detail === undefined
        ? { ok: false, failure }
        : { ok: false, failure, detail: f.detail };
    }
    let json: unknown;
    try {
      json = await answer.json();
    } catch {
      return { ok: false, failure: 'server', detail: 'bad-answer' };
    }
    if (!Array.isArray(json)) return { ok: false, failure: 'server', detail: 'bad-answer' };
    for (const item of json as {
      full_name?: unknown;
      private?: unknown;
      permissions?: { push?: unknown };
    }[]) {
      if (typeof item.full_name === 'string')
        repositories.push({
          fullName: item.full_name,
          private: item.private === true,
          canWrite: item.permissions?.push === true,
        });
    }
    const next = /<([^>]+)>\s*;\s*rel="next"/.exec(answer.headers.get('Link') ?? '')?.[1];
    // The token is only ever sent to the API base it was given.
    url = next !== undefined && next.startsWith(`${apiBase}/`) ? next : undefined;
    if (page === 1 && url !== undefined) return { ok: true, repositories, more: true };
  }
  return { ok: true, repositories, more: false };
}

export interface SetupLinks {
  /** GitHub's "new repository" form with the name and `visibility=private` in the address. */
  repositoryUrl: string;
  /**
   * GitHub's "new fine-grained token" form with name, description, a year's expiry and
   * Contents: read and write in the address; the repository selection has no parameter.
   */
  tokenUrl: string;
}

export const DEFAULT_REPOSITORY_NAME = 'domus-sync';
export const DEFAULT_TOKEN_NAME = 'Domus';

/**
 * The two links of the setup screen, both forms filled in by GitHub's documented query
 * parameters (docs/github.md): `name`, `visibility` for the repository; `name`,
 * `description`, `expires_in` (days, at most 366) and `contents=write` for the token.
 */
export function setupLinks(
  options: { name?: string; tokenName?: string; tokenDescription?: string } = {},
): SetupLinks {
  const name = options.name ?? DEFAULT_REPOSITORY_NAME;
  const token = new URLSearchParams({
    name: (options.tokenName ?? DEFAULT_TOKEN_NAME).slice(0, 40),
    description: (options.tokenDescription ?? `Sync of ${name}`).slice(0, 1024),
    expires_in: '366',
    contents: 'write',
  });
  return {
    repositoryUrl: `https://github.com/new?name=${encodeURIComponent(name)}&visibility=private`,
    tokenUrl: `https://github.com/settings/personal-access-tokens/new?${token.toString()}`,
  };
}
