// What the GitHub adapter and the GitHub connection test share: the checked
// options, one request and the mapping of an answer that is not a success.
// Nothing here puts the token into a result: details are fixed words, status
// codes and a reset time. Behaviour of GitHub is as documented, not measured:
// docs/github.md.
import type { AdapterFailure } from '@nexumia-de/materia';
import { pathSegments } from './webdav-url';

export interface GithubOptions {
  /** `owner/name` of the one private repository everything is kept in. */
  repository: string;
  /** A fine-grained personal access token limited to that repository (Contents: read and write). */
  token: string;
  /** Path prefix inside the repository; default none. */
  folder?: string;
  /** Branch; default is the repository's default branch (the parameter is left out). */
  branch?: string;
  /** Commit message of a write; default `sync <last path segment>`. Must hold nothing personal. */
  message?: string | ((path: string) => string);
  /** Base of the REST API; default `https://api.github.com`, injectable for tests. */
  apiBase?: string;
  /** For tests; defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Whether the browser thinks it is online; for tests, defaults to `navigator.onLine`. */
  online?: () => boolean;
}

export type Failure = { ok: false; failure: AdapterFailure; detail?: string };

export const fail = (failure: AdapterFailure, detail?: string): Failure =>
  detail === undefined ? { ok: false, failure } : { ok: false, failure, detail };

export const DEFAULT_API_BASE = 'https://api.github.com';

const REPOSITORY = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;

/** Splits `owner/name`; throws a RangeError (without echoing the text) for anything else. */
export function parseRepository(repository: string): { owner: string; name: string } {
  const match = REPOSITORY.exec(repository);
  const owner = match?.[1];
  const name = match?.[2];
  if (
    owner === undefined ||
    name === undefined ||
    owner === '.' ||
    owner === '..' ||
    name === '.' ||
    name === '..'
  )
    throw new RangeError('The repository must be written owner/name');
  return { owner, name };
}

export interface Resolved {
  repoPath: string;
  apiBase: string;
  /** Encoded segments of the folder, possibly none. */
  folder: string[];
  branch: string | undefined;
  /** Encoded address of a file's contents, without the query. */
  contentsUrl: (path: string) => string;
  /** Request headers, token included. */
  headers: () => Record<string, string>;
  doFetch: () => typeof fetch;
  online: () => boolean;
}

/** Checks the options; every RangeError is thrown here, before any request. */
export function resolve(options: {
  repository: string;
  token: string;
  folder?: string;
  branch?: string;
  apiBase?: string;
  fetch?: typeof fetch;
  online?: () => boolean;
}): Resolved {
  const { owner, name } = parseRepository(options.repository);
  const apiBase = (options.apiBase ?? DEFAULT_API_BASE).replace(/\/+$/, '');
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const folder =
    options.folder === undefined || options.folder.replace(/\//g, '') === ''
      ? []
      : pathSegments(options.folder).map(encodeURIComponent);
  const token = options.token;
  return {
    repoPath,
    apiBase,
    folder,
    branch: options.branch === '' ? undefined : options.branch,
    contentsUrl: (path) =>
      `${apiBase}${repoPath}/contents/${[...folder, ...pathSegments(path).map(encodeURIComponent)].join('/')}`,
    headers: () => ({
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    }),
    doFetch: () => options.fetch ?? globalThis.fetch.bind(globalThis),
    online: options.online ?? (() => globalThis.navigator?.onLine !== false),
  };
}

/**
 * One request. A TypeError from `fetch` means the page got no answer it may read; the
 * failure follows `navigator.onLine`, as in the WebDAV adapter.
 */
export async function send(
  r: Resolved,
  method: string,
  url: string,
  extra: Record<string, string> = {},
  body?: string,
): Promise<Response | Failure> {
  const init: RequestInit = {
    method,
    headers: { ...r.headers(), ...extra },
    credentials: 'omit',
    cache: 'no-store',
  };
  if (body !== undefined) init.body = body;
  try {
    return await r.doFetch()(url, init);
  } catch (error) {
    if (error instanceof TypeError) return fail(r.online() ? 'blocked' : 'unreachable');
    throw error;
  }
}

/** The failure for 401, 403 and 429 (rate limit or not); `undefined` for other statuses. */
function accessFailure(answer: Response): Failure | undefined {
  const { status, headers } = answer;
  if (status === 401) return fail('unauthorised');
  if (status !== 403 && status !== 429) return undefined;
  const remaining = headers.get('x-ratelimit-remaining');
  const retryAfter = headers.get('retry-after');
  if (status === 403 && remaining !== '0' && retryAfter === null) return fail('unauthorised');
  const reset = Number(headers.get('x-ratelimit-reset'));
  if (headers.get('x-ratelimit-reset') !== null && Number.isFinite(reset) && reset > 0)
    return fail('server', `rate-limited until ${new Date(reset * 1000).toISOString()}`);
  return fail('server', 'rate-limited');
}

/** The failure of an answer that is not a success and has no meaning of its own. */
export function failureOf(answer: Response): Failure {
  return accessFailure(answer) ?? fail('server', `HTTP ${answer.status}`);
}

export { accessFailure };
