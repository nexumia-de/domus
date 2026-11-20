// Shared by the browser checks of the apps (`@nexumia-de/hospes/testing/browser`): a static
// server for a built app, Chromium, a "device" (a browser context with storage of its own: a
// second one is a second device), the watchers that collect problems, and the audits every
// screen goes through. Not part of an app's bundle.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

export const serveDir = async (dir) => {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
  };
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
    let file = join(dir, path);
    if (!file.startsWith(dir) || !existsSync(file)) return response.writeHead(404).end();
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    response.writeHead(200, {
      'content-type': types[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    createReadStream(file).pipe(response);
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => server.close(done)),
  };
};

export const launch = () =>
  chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

let failures = 0;
export const check = (ok, what) => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
};
export const failureCount = () => failures;

/**
 * A device: a context of its own (its own IndexedDB and storage), watched for console errors,
 * page errors, security-policy violations, bad answers from the page's own server and requests
 * to any host that is not allowed.
 */
export async function newDevice(browser, { origin, allowed, locale, width, height, problems }) {
  const context = await browser.newContext({
    viewport: { width, height },
    locale,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const own = (url) => new URL(url).origin === origin;
  const note = (text) => problems.push(text);
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  context.on('page', (page) => {
    // A failed request (a 401, an aborted one) is logged by the browser as "Failed to load
    // resource"; the scenarios that cause one expect it. Anything else is a problem.
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
        note(`console: ${m.text()}`);
      }
    });
    page.on('pageerror', (e) => note(`pageerror: ${e.message}`));
  });
  context.on('request', (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith('http') && !allowed.includes(url.origin)) {
      note(`foreign request: ${r.url()}`);
    }
  });
  context.on('response', (r) => {
    if (own(r.url()) && r.status() >= 400) note(`${r.status()}: ${r.url()}`);
  });
  const page = await context.newPage();
  return { context, page };
}

/** Taps that are smaller than 44 px and horizontal overflow, on the page as it is now. */
export const audit = (page) =>
  page.evaluate(() => {
    const visible = (node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden';
    };
    const small = [];
    for (const node of document.querySelectorAll(
      'a[href], button, input:not([type=hidden]), select, textarea, summary',
    )) {
      if (!visible(node)) continue;
      const target =
        node instanceof HTMLInputElement && node.type === 'checkbox'
          ? (node.closest('label') ?? node)
          : node;
      const box = target.getBoundingClientRect();
      if (box.height < 43.99 || box.width < 43.99) {
        small.push(
          `${node.tagName.toLowerCase()} "${(node.textContent || node.getAttribute('aria-label') || node.id).trim().slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`,
        );
      }
    }
    const root = document.documentElement;
    return {
      small,
      overflow: Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth,
    };
  });

/** Everything on the page that could hold a secret, as one text. */
export const everything = (page) =>
  page.evaluate(async () => {
    const parts = [location.href, document.documentElement.outerHTML, document.body.innerText];
    for (const input of document.querySelectorAll('input, textarea')) parts.push(input.value);
    parts.push(JSON.stringify({ ...localStorage }), JSON.stringify({ ...sessionStorage }));
    return parts.join('\n');
  });
