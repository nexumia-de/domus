// `npm run e2e -w @emptio/app`: builds the app against a fake GitHub on localhost (a test build:
// the API address is compiled in, see build.mjs), serves it, and runs the browser checks at
// 360 x 720 in English and German and at 1200 x 800 in English. Two bundles are made for the
// checks: the app's texts (texts-entry.mjs) and what puts a shared space into the page's database
// (seed-entry.mjs). Chromium: PLAYWRIGHT_CHROMIUM_PATH when set.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { buildApp } from '../build.mjs';
import { startFakeGithub } from '@nexumia-de/hospes/testing/fake-github';
import {
  check,
  failureCount,
  launch,
  newDevice,
  serveDir,
} from '@nexumia-de/hospes/testing/browser';
import { categoriesStage, entryStage } from './entry-scenario.mjs';
import { toastStage, viewStage } from './frame-scenario.mjs';
import { clearStage, listStage } from './scenario.mjs';
import { offlineStage, screensStage, settingsStage } from './settings-scenario.mjs';
import { reportStage } from './report-scenario.mjs';
import { syncStage } from './sync-scenario.mjs';
import { kitchenowlStage } from './kitchenowl-scenario.mjs';

const work = mkdtempSync(join(tmpdir(), 'emptio-e2e-'));
const bundle = (entry, outfile, options) =>
  build({
    entryPoints: [join(import.meta.dirname, entry)],
    bundle: true,
    outfile: join(work, outfile),
    logLevel: 'warning',
    ...options,
  });
await bundle('texts-entry.mjs', 'texts.mjs', { format: 'esm', platform: 'node' });
await bundle('seed-entry.mjs', 'seed.js', {
  format: 'iife',
  globalName: '__seed',
  platform: 'browser',
});
const texts = await import(join(work, 'texts.mjs'));
const seed = readFileSync(join(work, 'seed.js'), 'utf8');

const fake = await startFakeGithub();
const dist = await buildApp({ outdir: join(work, 'dist'), githubApi: fake.origin });
const server = await serveDir(dist.outdir);
const browser = await launch();
const problems = [];

const EN = { code: 'en', locale: 'en-US', t: texts.stringsEn };
const DE = { code: 'de', locale: 'de-DE', t: texts.stringsDe };
const runs = [
  { width: 360, height: 720, own: EN, other: DE },
  { width: 360, height: 720, own: DE, other: EN },
  { width: 1200, height: 800, own: EN, other: DE },
];

// E2E_ONLY=syncStage,listStage: run just these stages (the stage functions' names).
const only = process.env.E2E_ONLY?.split(',');
const stages = [
  listStage,
  toastStage,
  viewStage,
  entryStage,
  categoriesStage,
  screensStage,
  reportStage,
  clearStage,
  settingsStage,
  offlineStage,
];

try {
  for (const { width, height, own, other } of runs) {
    const label = `${width}x${height} ${own.code}`;
    const run = {
      label,
      width,
      height,
      locale: own.locale,
      lang: own.code,
      t: own.t,
      other,
      texts,
      seed,
      server,
      fake,
      browser,
      problems,
    };
    console.log(`\n== ${label}`);
    // The first device is not allowed to reach any origin but the app's own: no space has a storage.
    const device = await newDevice(browser, {
      origin: server.origin,
      allowed: [server.origin],
      locale: own.locale,
      width,
      height,
      problems,
    });
    device.page.setDefaultTimeout(8_000);
    for (const stage of stages) {
      if (only && !only.includes(stage.name)) continue;
      try {
        await stage(run, device);
      } catch (error) {
        check(
          false,
          `${label}: ${stage.name} aborted: ${String(error.message)
            .split('\n')
            .slice(0, process.env.E2E_VERBOSE ? 40 : 1)
            .join(' | ')}`,
        );
      }
    }
    await device.context.close();
    try {
      if (!only || only.includes('syncStage')) await syncStage(run);
    } catch (error) {
      check(false, `${label}: syncStage aborted: ${String(error.message).split('\n')[0]}`);
    }
    try {
      if (!only || only.includes('kitchenowlStage')) await kitchenowlStage(run);
    } catch (error) {
      check(false, `${label}: kitchenowlStage aborted: ${String(error.message).split('\n')[0]}`);
    }
    check(
      problems.length === 0,
      `${label}: no console errors, page errors, policy violations or foreign requests ${problems.splice(0).join('; ')}`,
    );
  }
} catch (error) {
  check(false, `e2e aborted: ${error.stack ?? error.message}`);
} finally {
  await browser.close();
  await server.close();
  await fake.close();
  rmSync(work, { recursive: true, force: true });
}
console.log(failureCount() === 0 ? 'e2e passed' : `e2e failed: ${failureCount()} check(s)`);
process.exit(failureCount() === 0 ? 0 : 1);
