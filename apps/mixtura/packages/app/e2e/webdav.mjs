/* global window, document -- in functions the page runs */
// The WebDAV adapter in a real browser against a real server: the page comes
// from the app's origin (with its Content-Security-Policy), the server from
// another, so CORS and `connect-src` are both exercised. Needs the server of
// tools/webdav-server (docs/sync-backends.md#test-server):
//
//   MIXTURA_WEBDAV_URL=http://127.0.0.1:8080 MIXTURA_WEBDAV_PASSWORD=... node e2e/webdav.mjs [width height]
//
// MIXTURA_WEBDAV_USER defaults to `mixtura`. Without the address the script
// says so and ends successfully.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { launch } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const url = process.env.MIXTURA_WEBDAV_URL;
if (!url) {
  console.log(
    'skipped: MIXTURA_WEBDAV_URL is not set (start tools/webdav-server, see docs/sync-backends.md)',
  );
  process.exit(0);
}
const username = process.env.MIXTURA_WEBDAV_USER ?? 'mixtura';
const password = process.env.MIXTURA_WEBDAV_PASSWORD ?? '';
const [width = 360, height = 720] = process.argv
  .slice(2)
  .filter((a) => /^\d+$/.test(a))
  .map(Number);

// The adapter as one script, run in the page.
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await build({
  stdin: {
    contents: "export * from './src/sync/webdav'; export * from './src/sync/webdav-connection';",
    resolveDir: app,
    loader: 'ts',
  },
  bundle: true,
  format: 'iife',
  globalName: 'mixturaWebdav',
  write: false,
  logLevel: 'error',
});

const site = await serve();
const browser = await launch();
const context = await browser.newContext({ viewport: { width, height } });
const page = await context.newPage();
const problems = [];
page.on('console', (m) => process.env.MIXTURA_DEBUG && console.log('console:', m.text()));
page.on(
  'requestfailed',
  (r) =>
    process.env.MIXTURA_DEBUG &&
    console.log('failed:', r.method(), r.url().slice(-40), r.failure()?.errorText),
);
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
// Injected by the test harness (not subject to the page's policy); only `fetch` is the page's.
await page.addInitScript({
  content: `${bundle.outputFiles[0].text};window.mixturaWebdav = mixturaWebdav;`,
});
await page.addInitScript(() => {
  window.__violations = [];
  document.addEventListener('securitypolicyviolation', (event) => {
    window.__violations.push(`${event.violatedDirective} blocked ${event.blockedURI}`);
  });
});
await page.goto(`${site.url}#/about`);
await page.locator('.pane h1:visible').last().waitFor();
// The service worker controls the page, as in an installed app: it must leave the storage's
// requests alone (src/sw.ts), which a page without a worker would not show.
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
await page.reload({ waitUntil: 'load' });
await page.locator('.pane h1:visible').last().waitFor();
expect(
  await page.evaluate(() => navigator.serviceWorker.controller !== null),
  'the service worker controls the page',
);

// Everything below runs in the page: the adapter's `fetch` is the page's own.
const run = (work, arg) =>
  page.evaluate(
    ([source, input]) =>
      new Function('lib', 'input', `return (${source})(lib, input)`)(window.mixturaWebdav, input),
    [work.toString(), arg],
  );
const config = { baseUrl: url, username, password, folder: `e2e-${Date.now()}` };

const steps = await run(async (lib, c) => {
  const adapter = lib.createWebdavAdapter({
    baseUrl: c.baseUrl,
    username: c.username,
    password: c.password,
  });
  const path = `${c.folder}/places/p1/stock.json`;
  const pause = (ms) => new Promise((done) => setTimeout(done, ms));
  const out = {};
  out.missing = await adapter.read(path);
  out.created = await adapter.write(path, '{"n":1}', null);
  out.createdAgain = await adapter.write(path, '{"n":2}', null);
  out.read = await adapter.read(path);
  // A file written a moment ago has a weak ETag on Apache, which never matches If-Match.
  await pause(1200);
  const current = await adapter.read(path);
  out.current = current;
  out.conditional = await adapter.write(path, '{"n":3}', current.etag);
  out.stale = await adapter.write(path, '{"n":4}', current.etag);
  out.after = await adapter.read(path);
  out.unconditional = await adapter.write(path, '{"n":5}');
  const wrong = lib.createWebdavAdapter({
    baseUrl: c.baseUrl,
    username: c.username,
    password: `${c.password}-wrong`,
  });
  out.wrongRead = await wrong.read(path);
  out.wrongWrite = await wrong.write(path, '{}');
  out.connection = await lib.testConnection(adapter);
  out.wrongConnection = await lib.testConnection(wrong);
  return out;
}, config);

if (process.env.MIXTURA_DEBUG) console.log(JSON.stringify(steps, null, 1));
expect(steps.missing.ok && steps.missing.missing, 'read of a missing file: missing');
expect(
  steps.created.ok,
  'create (If-None-Match: *) made the folders with MKCOL and wrote the file',
);
expect(
  !steps.createdAgain.ok && steps.createdAgain.failure === 'conflict',
  'create on an existing file: conflict',
);
expect(
  steps.read.ok &&
    !steps.read.missing &&
    steps.read.body === '{"n":1}' &&
    typeof steps.read.etag === 'string',
  `read gives the body and the ETag the page may see (${steps.read.etag})`,
);
expect(steps.conditional.ok, 'write with the current ETag (If-Match) succeeds');
expect(!steps.stale.ok && steps.stale.failure === 'conflict', 'write with the old ETag: conflict');
expect(steps.after.body === '{"n":3}', 'the stale write changed nothing');
expect(steps.unconditional.ok, 'unconditional write succeeds');
expect(
  steps.wrongRead.failure === 'unauthorised' && steps.wrongWrite.failure === 'unauthorised',
  'wrong password: unauthorised for read and write, readable by the page (CORS on the 401)',
);
expect(steps.connection.state === 'reachable', 'Test Connection: reachable');
expect(
  steps.wrongConnection.state === 'unauthorised',
  'Test Connection with a wrong password: unauthorised',
);

// A server the page may not reach: the browser says online, so `blocked`; offline, `unreachable`.
const down = await run(async (lib) => {
  const adapter = lib.createWebdavAdapter({ baseUrl: 'http://127.0.0.1:9' });
  return adapter.read('a.json');
});
expect(!down.ok && down.failure === 'blocked', 'a dead address while online: blocked');
await context.setOffline(true);
const offline = await run(async (lib, c) => {
  const adapter = lib.createWebdavAdapter({
    baseUrl: c.baseUrl,
    username: c.username,
    password: c.password,
  });
  return adapter.read('a.json');
}, config);
await context.setOffline(false);
expect(!offline.ok && offline.failure === 'unreachable', 'offline: unreachable');

// The policy still stops everything else: plain http to a public address, and a host
// the page may reach over https that nobody configured is allowed by design (docs/sync-backends.md#policy).
const before = await page.evaluate(() => window.__violations.length);
const refused = await run(async (lib) => {
  const adapter = lib.createWebdavAdapter({ baseUrl: 'http://192.0.2.1/dav' });
  return adapter.read('a.json');
});
expect(!refused.ok && refused.failure === 'blocked', 'http to a public address: blocked');
const violations = await page.evaluate(() => window.__violations);
expect(
  violations.length > before && /connect-src/.test(violations.at(-1)),
  `and reported as a connect-src violation (${violations.at(-1)})`,
);
expect(
  !violations.slice(0, before).length,
  'the requests to the configured server caused no policy violation',
);
expect(problems.length === 0, `no page error ${problems}`);

await browser.close();
await site.close();
