// The GitHub adapter: materia's StorageAdapter on the Contents API of one
// private repository, `fetch` only, for a browser page. What it needs, the
// mapping of answers and its limits: docs/github.md. Everything said about
// GitHub here is its documented behaviour as far as known; none of it was
// measured against the live API.
import type { ReadResult, StorageAdapter, WriteResult } from '@nexumia-de/materia';
import { base64ToBytes, bytesToBase64 } from './base64';
import {
  accessFailure,
  fail,
  failureOf,
  resolve,
  send,
  type Failure,
  type GithubOptions,
} from './github-http';
import { pathSegments } from './webdav-url';

export type { GithubOptions } from './github-http';

interface ContentsFile {
  sha: string;
  size: number;
  type: string;
  encoding?: string;
  content?: string;
}

type Fetched =
  Failure | { missing: true } | { missing: false; file: ContentsFile; etag: string | null };

export function createGithubAdapter(options: GithubOptions): StorageAdapter {
  const r = resolve(options);
  const { branch } = r;
  // The HTTP ETag and the result of the last successful read, per path. GitHub documents that
  // a request answered with 304 does not count against the rate limit; not measured here.
  const memory = new Map<string, { etag: string; result: ReadResult }>();

  const messageFor = (path: string): string => {
    const segments = pathSegments(path);
    const { message } = options;
    if (typeof message === 'function') return message(path);
    return message ?? `sync ${segments[segments.length - 1] ?? ''}`;
  };

  const decode = (file: ContentsFile): ReadResult => {
    if (file.type !== 'file') return fail('server', 'not-a-file');
    if (file.encoding !== 'base64' || typeof file.content !== 'string') {
      // Files over 1 MB come with empty content and encoding "none".
      return file.size > 0 ? fail('server', 'too-large') : fail('server', 'not-a-file');
    }
    if (file.content === '' && file.size > 0) return fail('server', 'too-large');
    const bytes = base64ToBytes(file.content.replace(/\s+/g, ''));
    if (bytes === undefined) return fail('server', 'bad-base64');
    try {
      const body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return { ok: true, missing: false, body, etag: file.sha };
    } catch {
      return fail('server', 'not-utf8');
    }
  };

  /** GET of the contents; `conditional` sends If-None-Match when a read was remembered. */
  async function fetchFile(path: string, conditional: boolean): Promise<Fetched | 'same'> {
    const url = r.contentsUrl(path);
    const headers: Record<string, string> = {};
    const known = memory.get(path);
    if (conditional && known) headers['If-None-Match'] = known.etag;
    const answer = await send(
      r,
      'GET',
      branch === undefined ? url : `${url}?ref=${encodeURIComponent(branch)}`,
      headers,
    );
    if (!(answer instanceof Response)) return answer;
    if (answer.status === 304) return known ? 'same' : fail('server', 'HTTP 304');
    if (answer.status === 404) return { missing: true };
    if (answer.status !== 200) return failureOf(answer);
    let json: unknown;
    try {
      json = await answer.json();
    } catch {
      return fail('server', 'bad-answer');
    }
    if (json === null || typeof json !== 'object' || Array.isArray(json))
      return fail('server', 'not-a-file');
    const file = json as ContentsFile;
    if (typeof file.sha !== 'string') return fail('server', 'bad-answer');
    return { missing: false, file, etag: answer.headers.get('ETag') };
  }

  return {
    async read(path): Promise<ReadResult> {
      const got = await fetchFile(path, true);
      if (got === 'same') return (memory.get(path) as { result: ReadResult }).result;
      if ('ok' in got) return got;
      if (got.missing) {
        memory.delete(path);
        return { ok: true, missing: true };
      }
      const result = decode(got.file);
      if (result.ok && got.etag !== null) memory.set(path, { etag: got.etag, result });
      else memory.delete(path);
      return result;
    },

    async write(path, body, ifMatch): Promise<WriteResult> {
      const url = r.contentsUrl(path);
      const message = messageFor(path);
      let sha: string | undefined;
      if (typeof ifMatch === 'string') sha = ifMatch;
      else if (ifMatch === undefined) {
        const current = await fetchFile(path, false);
        if (current === 'same') return fail('server', 'bad-answer');
        if ('ok' in current) return current;
        if (!current.missing) sha = current.file.sha;
      }
      const payload: Record<string, string> = {
        message,
        content: bytesToBase64(new TextEncoder().encode(body)),
      };
      if (sha !== undefined) payload.sha = sha;
      if (branch !== undefined) payload.branch = branch;
      memory.delete(path);
      const answer = await send(
        r,
        'PUT',
        url,
        { 'Content-Type': 'application/json' },
        JSON.stringify(payload),
      );
      if (!(answer instanceof Response)) return answer;
      if (answer.status === 200 || answer.status === 201) {
        try {
          const json = (await answer.json()) as { content?: { sha?: unknown } };
          const etag = json.content?.sha;
          return typeof etag === 'string' ? { ok: true, etag } : { ok: true };
        } catch {
          return { ok: true };
        }
      }
      if (answer.status === 409) return fail('conflict');
      if (answer.status === 422) {
        return ifMatch === undefined ? fail('server', 'HTTP 422') : fail('conflict');
      }
      if (answer.status === 404) return fail('not-found');
      return accessFailure(answer) ?? failureOf(answer);
    },
  };
}
