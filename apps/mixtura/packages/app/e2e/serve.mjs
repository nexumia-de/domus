// Serves the built app (dist/) on localhost for the walk, under `prefix`
// (default the root; '/mixtura/' mimics GitHub Pages). `overrides`
// maps a path (below the prefix) to a replacement body, to publish a "new build" while the
// page is open.
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

export const serve = async (dir = resolve('dist'), prefix = '/') => {
  const overrides = new Map();
  const server = createServer(async (request, response) => {
    const full = normalize(new URL(request.url, 'http://localhost').pathname);
    if (!full.startsWith(prefix)) return response.writeHead(404).end();
    const path = `/${full.slice(prefix.length)}`;
    const headers = { 'Cache-Control': 'no-cache' };
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
