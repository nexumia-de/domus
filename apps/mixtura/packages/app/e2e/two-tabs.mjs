/* global indexedDB -- in functions the page runs */
// Two tabs (issue #113): a second tab upgrades the database; the first tab
// closes its connection (onversionchange) and must then say so and offer a
// reload instead of failing on its next write. The "newer tab" is simulated
// by opening the database one version higher from a second page.
//
//   node e2e/two-tabs.mjs [width height]
import { launch } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const args = process.argv.slice(2);
const [width = 360, height = 720] = args.filter((a) => /^\d+$/.test(a)).map(Number);
const site = await serve();
const browser = await launch();
const context = await browser.newContext({ viewport: { width, height } });
const first = await context.newPage();
first.on('pageerror', (error) => {
  throw error;
});

await first.goto(`${site.url}#/stock`);
await first.locator('.stock-tree').waitFor();
expect((await first.getByText('Another window updated').count()) === 0, 'no banner at first');

const second = await context.newPage();
await second.goto(`${site.url}#/about`);
await second.locator('.pane h1:visible').last().waitFor();
const upgraded = await second.evaluate(
  () =>
    new Promise((resolve) => {
      const open = indexedDB.open('mixtura');
      open.onsuccess = () => {
        const next = open.result.version + 1;
        open.result.close();
        const up = indexedDB.open('mixtura', next);
        up.onsuccess = () => {
          up.result.close();
          resolve(next);
        };
        up.onblocked = () => resolve(0);
        up.onerror = () => resolve(-1);
      };
    }),
);
expect(upgraded > 0, `the second tab upgraded the database to version ${upgraded}`);

const banner = first.locator('.banner[role="status"]');
await banner.waitFor();
const text = await banner.innerText();
expect(
  /Another window updated the app or its data/.test(text) && /changes are not kept/.test(text),
  `the first tab says what happened and that it is read-only: ${text.replace(/\n/g, ' ')}`,
);
const reload = banner.getByRole('button', { name: 'Reload', exact: true });
expect((await reload.count()) === 1, 'the banner offers Reload, not Try Again');
expect((await banner.getByRole('button', { name: 'Try Again' }).count()) === 0, 'no Try Again');

// Reload really reloads (the new database version is newer than this build,
// so the app then reports a newer data version: still a clear message).
const navigated = first.waitForEvent('load');
await reload.click();
await navigated;
await first.locator('.pane h1:visible').last().waitFor();
expect(true, 'Reload reloads the page');
await browser.close();
await site.close();
