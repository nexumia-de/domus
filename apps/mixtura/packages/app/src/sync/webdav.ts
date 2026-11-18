// The WebDAV adapter: materia's StorageAdapter on `fetch` only, for a browser
// page. What a server must do for it, the mapping of answers to failures and
// its limits: docs/sync-backends.md.
import type { AdapterFailure, ReadResult, StorageAdapter, WriteResult } from '@mixtura/engine';
import { bytesToBase64 } from './base64';
import { fileUrl, folderUrls } from './webdav-url';

export interface WebdavOptions {
  /** Address of the folder everything is kept under, for example `https://dav.example/files/me/mixtura`. */
  baseUrl: string;
  username?: string;
  password?: string;
  /** For tests; defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Whether the browser thinks it is online; for tests, defaults to `navigator.onLine`. */
  online?: () => boolean;
  /** Waits this many milliseconds; for tests, defaults to `setTimeout`. */
  delay?: (ms: number) => Promise<void>;
}

/** How long Apache keeps an ETag weak after a write, plus a margin (docs/sync-backends.md). */
export const WEAK_ETAG_WAIT_MS = 1100;

const isWeak = (etag: string): boolean => etag.startsWith('W/');
/** `If-Match` never matches a weak ETag, so the strong form is sent. */
const strong = (etag: string): string => (isWeak(etag) ? etag.slice(2) : etag);

type Failure = { ok: false; failure: AdapterFailure; detail?: string };

const fail = (failure: AdapterFailure, detail?: string): Failure =>
  detail === undefined ? { ok: false, failure } : { ok: false, failure, detail };

/** The failure of an answer that is not a success; `undefined` for a 2xx. */
function failureOf(status: number): Failure | undefined {
  if (status >= 200 && status < 300) return undefined;
  if (status === 412) return fail('conflict');
  if (status === 401 || status === 403) return fail('unauthorised');
  return fail('server', `HTTP ${status}`);
}

export function createWebdavAdapter(options: WebdavOptions): StorageAdapter {
  const { baseUrl, username, password } = options;
  const delay =
    options.delay ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  const online = options.online ?? (() => globalThis.navigator?.onLine !== false);
  const authorization =
    username === undefined && password === undefined
      ? undefined
      : `Basic ${bytesToBase64(new TextEncoder().encode(`${username ?? ''}:${password ?? ''}`))}`;

  /**
   * One request. A TypeError from `fetch` means the page got no answer it may read: a dead
   * server, no network, or a CORS or mixed-content refusal. A page cannot tell them apart,
   * so the failure follows `navigator.onLine`.
   */
  async function send(
    method: string,
    url: string,
    headers: Record<string, string> = {},
    body?: string,
  ): Promise<Response | Failure> {
    const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    const init: RequestInit = {
      method,
      headers: { ...headers, ...(authorization ? { Authorization: authorization } : {}) },
      credentials: 'omit',
      cache: 'no-store',
    };
    if (body !== undefined) init.body = body;
    try {
      return await doFetch(url, init);
    } catch (error) {
      if (error instanceof TypeError) return fail(online() ? 'blocked' : 'unreachable');
      throw error;
    }
  }

  /** MKCOL of every folder above the file, outermost first; an existing folder (405) is fine. */
  async function makeFolders(path: string): Promise<Failure | undefined> {
    for (const url of folderUrls(baseUrl, path)) {
      const answer = await send('MKCOL', url);
      if (!(answer instanceof Response)) return answer;
      if (answer.status === 401 || answer.status === 403) return fail('unauthorised');
      if (answer.status !== 405 && !answer.ok)
        return fail('not-found', `MKCOL HTTP ${answer.status}`);
    }
    return undefined;
  }

  const put = (path: string, body: string, ifMatch: string | null | undefined) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof ifMatch === 'string') headers['If-Match'] = strong(ifMatch);
    else if (ifMatch === null) headers['If-None-Match'] = '*';
    return send('PUT', fileUrl(baseUrl, path), headers, body);
  };

  /**
   * A put that waits once and repeats when the caller's ETag was weak and the answer is 412:
   * the server may only have been inside the second in which it marks every ETag weak.
   */
  const putPatiently = async (path: string, body: string, ifMatch: string | null | undefined) => {
    const answer = await put(path, body, ifMatch);
    if (
      !(answer instanceof Response) ||
      answer.status !== 412 ||
      typeof ifMatch !== 'string' ||
      !isWeak(ifMatch)
    )
      return answer;
    await delay(WEAK_ETAG_WAIT_MS);
    return put(path, body, ifMatch);
  };

  const written = (answer: Response): WriteResult => {
    const failed = failureOf(answer.status);
    if (failed) return failed;
    const etag = answer.headers.get('ETag');
    return etag === null ? { ok: true } : { ok: true, etag };
  };

  return {
    async read(path): Promise<ReadResult> {
      const answer = await send('GET', fileUrl(baseUrl, path));
      if (!(answer instanceof Response)) return answer;
      if (answer.status === 404) return { ok: true, missing: true };
      const failed = failureOf(answer.status);
      if (failed) return failed;
      const etag = answer.headers.get('ETag');
      // The body arrived but the page may not read the header: the server lacks
      // `Access-Control-Expose-Headers: ETag`.
      if (etag === null) return fail('blocked', 'etag-not-exposed');
      return { ok: true, missing: false, body: await answer.text(), etag };
    },

    async write(path, body, ifMatch): Promise<WriteResult> {
      const first = await putPatiently(path, body, ifMatch);
      if (!(first instanceof Response)) return first;
      // 404, or 409 as WebDAV says it: the folder above the file is missing.
      if (first.status !== 404 && first.status !== 409) return written(first);
      if (folderUrls(baseUrl, path).length === 0) return fail('not-found', `HTTP ${first.status}`);
      const made = await makeFolders(path);
      if (made) return made;
      const retry = await putPatiently(path, body, ifMatch);
      if (!(retry instanceof Response)) return retry;
      if (retry.status === 404 || retry.status === 409) {
        return fail('not-found', `HTTP ${retry.status}`);
      }
      return written(retry);
    },
  };
}
