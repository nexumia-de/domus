// Shared by the e2e scripts: build, chromium launch, page watchers, checks.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const appDir = fileURLToPath(new URL('..', import.meta.url));
export const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

export const buildApp = () =>
  execFileSync('node', ['build.mjs'], { cwd: appDir, stdio: 'inherit' });

export const launch = () =>
  chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

/**
 * Collects problems of one context: console errors, page errors, CSP
 * violations, and requests to any origin except `origin`.
 */
export const watch = (context, origin) => {
  const problems = [];
  const page = (p) => {
    p.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
    p.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    p.on('load', () => {});
  };
  context.on('page', page);
  context.on('request', (r) => {
    const u = new URL(r.url());
    if (u.protocol.startsWith('http') && u.origin !== origin)
      problems.push(`foreign request: ${r.url()}`);
  });
  void context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  return problems;
};

let failures = 0;
export const check = (ok, what) => {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
};
export const failureCount = () => failures;
