// Shared by the e2e scripts: build, chromium launch, page watchers, checks.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const appDir = fileURLToPath(new URL('..', import.meta.url));
export const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

export const buildApp = () =>
  execFileSync('node', ['build.mjs'], { cwd: appDir, stdio: 'inherit' });

// E2E_WIDE_FONT=1 runs Chromium with DejaVu Sans as the default sans-serif and system-ui font, as on the
// CI runner (ubuntu), so that a layout that only fits a narrow system font (Inter here) fails locally
// too. A fontconfig file in a temporary directory does it; no font is added to the repository.
const wideFontEnv = () => {
  const dir = mkdtempSync(join(tmpdir(), 'culina-fonts-'));
  const rule = (family) =>
    `<match target="pattern"><test name="family"><string>${family}</string></test>` +
    `<edit name="family" mode="prepend" binding="strong"><string>DejaVu Sans</string></edit></match>`;
  const file = join(dir, 'fonts.conf');
  writeFileSync(
    file,
    `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig>` +
      `<include ignore_missing="yes">/etc/fonts/fonts.conf</include>` +
      ['sans-serif', 'system-ui', 'Inter'].map(rule).join('') +
      `</fontconfig>`,
  );
  const env = { ...process.env, FONTCONFIG_FILE: file };
  const found = execFileSync('fc-match', ['sans-serif'], { env, encoding: 'utf8' });
  if (!found.includes('DejaVu'))
    throw new Error(`E2E_WIDE_FONT: DejaVu Sans not installed (${found.trim()})`);
  return env;
};

export const launch = () =>
  chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    ...(process.env.E2E_WIDE_FONT ? { env: wideFontEnv() } : {}),
  });

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
