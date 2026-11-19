// A small fake of the GitHub REST endpoints the adapter and the setup screen use, for the browser
// checks. It answers CORS like api.github.com does (any origin, the headers the adapter sends,
// ETag exposed) and keeps every request in `log`, so a check can see where a token went.
//
//   GET  /user/repos                      the repositories the token reaches
//   GET  /repos/{o}/{r}                   private, size, permissions.push
//   GET  /repos/{o}/{r}/contents/{path}   404, or the file with sha; ETag, If-None-Match -> 304
//   PUT  /repos/{o}/{r}/contents/{path}   create (no sha) or update (current sha); 409 or 422 otherwise
//
// Tokens (the whole of the "account"): see `TOKENS`.
import { createServer } from 'node:http';

export const REPOSITORIES = {
  'me/household': { private: true },
  'me/a': { private: true },
  'me/b': { private: true },
  'me/open': { private: false },
};

/** token -> the repositories it reaches and whether it may write there. */
export const TOKENS = {
  github_pat_MAIN0000000000000000_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: {
    'me/household': true,
  },
  github_pat_READONLY00000000000_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb: {
    'me/household': false,
  },
  github_pat_NOREPOS0000000000000_cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc: {},
  github_pat_PUBLIC0000000000000_dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd: {
    'me/open': true,
  },
  github_pat_MULTI00000000000000_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee: {
    'me/a': true,
    'me/b': true,
  },
};
export const [MAIN, READONLY, NOREPOS, PUBLIC, MULTI] = Object.keys(TOKENS);
export const WRONG =
  'github_pat_WRONG00000000000000_ffffffffffffffffffffffffffffffffffffffffffffffffffffff';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'authorization, accept, x-github-api-version, content-type, if-none-match',
  'access-control-allow-methods': 'GET, PUT, OPTIONS',
  'access-control-expose-headers':
    'ETag, Link, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After',
  'access-control-max-age': '600',
};

/** @returns {Promise<{ origin: string, close(): Promise<void>, log: object[], files: Map<string, {content: string, sha: string}>, fail: { status?: number, headers?: object } }>} */
export async function startFakeGithub() {
  const files = new Map();
  const log = [];
  const state = { files, log, fail: {}, counter: 0 };

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://x');
    const token = /^Bearer (.+)$/.exec(request.headers.authorization ?? '')?.[1];
    log.push({
      method: request.method,
      path: url.pathname,
      search: url.search,
      token,
    });
    const send = (status, body, headers = {}) => {
      response.writeHead(status, { 'content-type': 'application/json', ...CORS, ...headers });
      response.end(body === undefined ? undefined : JSON.stringify(body));
    };
    if (request.method === 'OPTIONS') return send(204);
    if (state.fail.status)
      return send(state.fail.status, { message: 'forced' }, state.fail.headers);
    const reach = token === undefined ? undefined : TOKENS[token];
    if (reach === undefined) return send(401, { message: 'Bad credentials' });

    if (url.pathname === '/user/repos') {
      return send(
        200,
        Object.entries(reach).map(([fullName, push]) => ({
          full_name: fullName,
          private: REPOSITORIES[fullName].private,
          permissions: { push },
        })),
      );
    }
    const match = /^\/repos\/([^/]+)\/([^/]+)(?:\/contents\/(.+))?$/.exec(url.pathname);
    if (!match) return send(404, { message: 'Not Found' });
    const [, owner, name, rawPath] = match;
    const repo = `${owner}/${name}`;
    if (!(repo in reach)) return send(404, { message: 'Not Found' });
    if (rawPath === undefined) {
      return send(200, {
        full_name: repo,
        private: REPOSITORIES[repo].private,
        size: [...files.keys()].some((key) => key.startsWith(`${repo}:`)) ? 1 : 0,
        permissions: { push: reach[repo] },
      });
    }
    const key = `${repo}:${decodeURIComponent(rawPath)}`;
    const file = files.get(key);
    if (request.method === 'GET') {
      if (!file) return send(404, { message: 'Not Found' });
      const etag = `"${file.sha}"`;
      if (request.headers['if-none-match'] === etag) return send(304, undefined, { etag });
      return send(
        200,
        {
          type: 'file',
          encoding: 'base64',
          content: file.content.replace(/(.{60})/g, '$1\n'),
          sha: file.sha,
          size: file.content.length,
        },
        { etag },
      );
    }
    if (request.method === 'PUT') {
      if (!reach[repo])
        return send(403, { message: 'Resource not accessible by personal access token' });
      let text = '';
      for await (const chunk of request) text += chunk;
      const body = JSON.parse(text);
      if (file && body.sha !== file.sha) return send(409, { message: 'sha does not match' });
      if (!file && body.sha !== undefined)
        return send(422, { message: 'sha was supplied but file does not exist' });
      state.counter += 1;
      const sha = `sha${state.counter}`;
      files.set(key, { content: String(body.content).replace(/\s/g, ''), sha });
      return send(file ? 200 : 201, { content: { sha, path: decodeURIComponent(rawPath) } });
    }
    return send(405, { message: 'Method not allowed' });
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return {
    ...state,
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => server.close(done)),
  };
}
