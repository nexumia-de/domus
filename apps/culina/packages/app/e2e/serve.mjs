// A tiny static file server for dist/. `base` serves the app under a sub-path;
// `redirectIndex` answers `index.html` with a 307 to its folder, as some static hosts do.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};

/** Starts on a free port; resolves to { origin, url, close }. `url` ends with the base. */
export const serve = (dir, base = '/', { redirectIndex = false } = {}) =>
  new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (!path.startsWith(base)) {
        res.writeHead(404).end('not found');
        return;
      }
      let rel = path.slice(base.length);
      if (redirectIndex && rel.endsWith('index.html')) {
        res.writeHead(307, { location: path.slice(0, -'index.html'.length) }).end();
        return;
      }
      if (rel === '' || rel.endsWith('/')) rel += 'index.html';
      rel = normalize(rel);
      if (rel.startsWith('..')) {
        res.writeHead(403).end();
        return;
      }
      try {
        const body = await readFile(join(dir, rel));
        res.writeHead(200, {
          'content-type': TYPES[extname(rel)] ?? 'application/octet-stream',
          // The service worker must always be revalidated.
          'cache-control': 'no-cache',
        });
        res.end(body);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const origin = `http://127.0.0.1:${server.address().port}`;
      resolve({
        origin,
        url: origin + base,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
