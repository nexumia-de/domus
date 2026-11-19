// Serves the built app (dist/) on localhost for the walk, under `prefix`
// (default the root; '/mixtura/' mimics GitHub Pages). `overrides`
// maps a path (below the prefix) to a replacement body, to publish a "new build" while the
// page is open. Without `cacheControl` it behaves like Cloudflare Workers
// static assets: Cloudflare's default Cache-Control, then the rules of dist/_headers
// (what wrangler uploads). With `cacheControl` every response carries that one
// header and `_headers` is ignored (GitHub Pages: 'max-age=600'). `redirectIndex`
// answers /index.html with a 307 to the folder, as Cloudflare's default HTML handling does.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

// The `_headers` rules: a path pattern (one `*` splat allowed) and its headers.
const parseHeaders = (text) => {
  const rules = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '' || line.startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      const source = line
        .trim()
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace('*', '.*');
      rules.push({ match: new RegExp(`^${source}$`), headers: {} });
      continue;
    }
    const at = line.indexOf(':');
    rules.at(-1).headers[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return rules;
};

export const serve = async (
  dir = resolve('dist'),
  prefix = '/',
  cacheControl = undefined,
  { redirectIndex = false } = {},
) => {
  const overrides = new Map();
  const rules = cacheControl
    ? []
    : parseHeaders(await readFile(join(dir, '_headers'), 'utf8').catch(() => ''));
  const server = createServer(async (request, response) => {
    const full = normalize(new URL(request.url, 'http://localhost').pathname);
    if (!full.startsWith(prefix)) return response.writeHead(404).end();
    const path = `/${full.slice(prefix.length)}`;
    if (redirectIndex && path === '/index.html') {
      return response.writeHead(307, { Location: prefix }).end();
    }
    const headers = { 'Cache-Control': cacheControl ?? 'public, max-age=0, must-revalidate' };
    for (const rule of rules) if (rule.match.test(path)) Object.assign(headers, rule.headers);
    if (overrides.has(path)) {
      response.writeHead(200, { ...headers, 'Content-Type': TYPES[extname(path)] ?? 'text/plain' });
      return response.end(overrides.get(path));
    }
    const file = join(dir, path.endsWith('/') ? `${path}index.html` : path);
    try {
      const body = await readFile(file);
      response.writeHead(200, { ...headers, 'Content-Type': TYPES[extname(file)] ?? 'text/plain' });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return {
    url: `http://localhost:${server.address().port}${prefix}`,
    overrides,
    close: () => new Promise((done) => server.close(done)),
  };
};

export const expect = (ok, what) => {
  if (!ok) throw new Error(`Failed: ${what}`);
  console.log(`ok: ${what}`);
};
