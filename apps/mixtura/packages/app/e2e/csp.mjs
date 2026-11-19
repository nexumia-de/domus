/* global document, window -- in functions the page runs */
// The page's Content-Security-Policy (index.html, docs/development.md,
// "Content Security Policy"): walks the main routes with the service
// worker controlling the page and the Buy Next ranking worker running, and
// fails on any `securitypolicyviolation` event or CSP message in the console.
// Then the same offline, served from the service worker's cache.
//
//   node e2e/csp.mjs [width height]
import { launch } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const args = process.argv.slice(2);
const [width = 360, height = 720] = args.filter((a) => /^\d+$/.test(a)).map(Number);
const routes = [
  '#/drinks',
  '#/drinks?sheet=filters',
  '#/drinks/daiquiri',
  '#/drinks/daiquiri?sheet=batch',
  '#/drinks/daiquiri?swap=',
  '#/drinks/new',
  '#/templates',
  '#/templates/daiquiri',
  '#/stock',
  '#/stock/buy-next',
  '#/settings',
  '#/settings/data',
  '#/about',
  '#/nowhere',
];

const site = await serve();
const browser = await launch();
const context = await browser.newContext({ viewport: { width, height } });
const page = await context.newPage();
const problems = [];
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
page.on('console', (message) => {
  if (/content security policy|refused to/i.test(message.text())) problems.push(message.text());
});
// The event fires in the page; the script records it before the app starts.
await page.addInitScript(() => {
  window.__violations = [];
  document.addEventListener('securitypolicyviolation', (event) => {
    window.__violations.push(`${event.violatedDirective} blocked ${event.blockedURI || 'inline'}`);
  });
});
const violations = async () => [
  ...problems,
  ...(await page.evaluate(() => window.__violations ?? [])),
];

const csp = async () => {
  const response = await page.request.get(site.url);
  const html = await response.text();
  return /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)?.[1] ?? '';
};
const policy = await csp();
// The header form (dist/_headers, which the test server applies like
// Cloudflare): the same policy plus frame-ancestors, on the page and the scripts.
for (const path of ['', 'sw.js', 'rank-worker.js']) {
  const headers = (await page.request.get(`${site.url}${path}`)).headers();
  expect(
    headers['content-security-policy'] === `${policy}; frame-ancestors 'none'`,
    `/${path} carries the policy as a header: the meta policy plus frame-ancestors`,
  );
}
expect(
  (await page.request.get(`${site.url}sw.js`)).headers()['cache-control'] === 'no-cache',
  'sw.js is served with no-cache',
);
// Hosts are allowed in `connect-src` only: the user's sync storage (docs/sync-backends.md#policy).
expect(
  /(?:^|; )connect-src 'self' https: http:\/\/localhost:\* http:\/\/127\.0\.0\.1:\*(?:;|$)/.test(
    policy,
  ) && !/https?:|\*/.test(policy.replace(/connect-src [^;]*/, '')),
  'only connect-src names hosts: https and the local machine for the sync storage',
);
expect(
  /script-src 'self'/.test(policy) && !/unsafe-/.test(policy) && /object-src 'none'/.test(policy),
  'the page carries a policy without unsafe-inline and unsafe-eval',
);

await page.goto(site.url, { waitUntil: 'load' });
await page.locator('nav.nav').waitFor();
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
expect(true, 'the service worker controls the page');
// A reload so the page itself is served by the worker.
await page.reload({ waitUntil: 'load' });
await page.locator('nav.nav').waitFor();

const walk = async (label) => {
  for (const route of routes) {
    await page.goto(`${site.url}${route}`);
    await page.locator('.pane h1:visible').last().waitFor();
    if (route === '#/stock/buy-next') {
      await page.locator('.buy-item, .status, [role="status"]').first().waitFor();
      const worker = await page.waitForEvent('worker', { timeout: 100 }).catch(() => null);
      const running = [worker, ...page.workers()].some((w) => w?.url().endsWith('rank-worker.js'));
      expect(running, `the ranking worker runs (${label})`);
    }
  }
  const found = await violations();
  expect(
    found.length === 0,
    `no policy violation on ${routes.length} routes (${label}) ${found.join('; ')}`,
  );
};
await walk('online');

await context.setOffline(true);
await page.reload({ waitUntil: 'load' });
await page.locator('nav.nav').waitFor();
await walk('offline');
const found = await violations();
if (found.length > 0) throw new Error(`Policy violations:\n${found.join('\n')}`);

// The policy really blocks: an inline script added by hand must not run.
await context.setOffline(false);
await page.goto(`${site.url}#/about`);
const ran = await page.evaluate(() => {
  const script = document.createElement('script');
  script.textContent = 'window.__inline = true';
  document.head.append(script);
  return window.__inline === true;
});
expect(!ran, 'an injected inline script does not run');
await page.waitForFunction(() => window.__violations.length > 0, null, { timeout: 3000 });
expect(true, 'and it is reported as a policy violation');

await browser.close();
await site.close();
