// `npm run e2e -w @domus/app`: builds the app against a fake GitHub on localhost (a test build:
// the API address is compiled in, see build.mjs), serves it, and runs the browser checks at
// 360 x 720 and 1200 x 800 in English and German. Chromium: PLAYWRIGHT_CHROMIUM_PATH when set.
// E2E_SHOTS=<folder>: also takes a screenshot of every screen in the German run at 360 x 720.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { buildApp } from '../build.mjs';
import { startFakeGithub } from './fake-github.mjs';
import { check, failureCount, launch, serveDir } from './harness.mjs';
import { makeShots, narrow, scenario } from './scenario.mjs';

const work = mkdtempSync(join(tmpdir(), 'domus-e2e-'));
await build({
  entryPoints: [join(import.meta.dirname, 'texts-entry.mjs')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(work, 'texts.mjs'),
  logLevel: 'warning',
});
const texts = await import(join(work, 'texts.mjs'));

const fake = await startFakeGithub();
const dist = await buildApp({ outdir: join(work, 'dist'), githubApi: fake.origin });
const server = await serveDir(dist);
const browser = await launch();
const problems = [];
try {
  const runs = [
    { width: 360, height: 720, lang: 'en', locale: 'en-US', t: texts.stringsEn },
    { width: 360, height: 720, lang: 'de', locale: 'de-DE', t: texts.stringsDe },
    { width: 1200, height: 800, lang: 'en', locale: 'en-US', t: texts.stringsEn },
    { width: 1200, height: 800, lang: 'de', locale: 'de-DE', t: texts.stringsDe },
  ];
  for (const run of runs) {
    const label = `${run.width}x${run.height} ${run.lang}`;
    const shots =
      process.env.E2E_SHOTS && run.width === 360 && run.lang === 'de'
        ? makeShots(process.env.E2E_SHOTS)
        : undefined;
    const context = { ...run, texts, server, fake, label, shots, problems };
    await scenario(browser, context);
    await narrow(browser, context);
    check(
      problems.length === 0,
      `${label}: no console errors, no policy violations, no request to any other host ${problems.splice(0).join('; ')}`,
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
