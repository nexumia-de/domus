// The alcohol filters of the drinks list in a real browser: the filter in the
// sheet and in the address, the class in words on the rows, the count of
// drinks that could not be classified with the reasons on a tap, the
// threshold presets in Settings (kept over a reload) and the 15 % line.
// Screenshots go to dist/walk/; with --docs also to docs/screenshots/ at
// scale 2 as app-alcohol-*.png.
//
//   node e2e/alcohol.mjs [width height] [--docs]
/* global document, location, window -- in functions the page runs */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, throttle } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const args = process.argv.slice(2);
const docs = args.includes('--docs');
const [width = 1200, height = 800] = args.filter((a) => /^\d+$/.test(a)).map(Number);
const OUT = resolve('dist', 'walk');
const DOCS = resolve('..', '..', 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });

const site = await serve();
const browser = await launch();
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: docs ? 2 : 1,
});
const page = await context.newPage();
await throttle(page, process.argv.slice(2));
page.on('pageerror', (error) => {
  throw error;
});
const external = [];
page.on('request', (request) => {
  if (!request.url().startsWith(site.url) && !request.url().startsWith('data:')) {
    external.push(request.url());
  }
});

const shot = (name) => page.screenshot({ path: join(OUT, `${name}-${width}x${height}.png`) });
const docShot = (name) =>
  docs
    ? page.screenshot({ path: join(DOCS, `app-alcohol-${name}-${width}x${height}.png`) })
    : undefined;
const waitCount = (text) =>
  page.waitForFunction(
    (want) => document.querySelector('.list-count')?.textContent === want,
    text,
    { timeout: 5000 },
  );
const noOverflow = async (where) => {
  const wide = await page.evaluate(() => {
    if (document.documentElement.scrollWidth > window.innerWidth) return 'page';
    for (const pane of document.querySelectorAll('.pane-scroll')) {
      if (pane.scrollWidth > pane.clientWidth + 1) return 'pane';
    }
    return '';
  });
  expect(wide === '', `no horizontal scrolling ${where} ${wide}`);
};
const targets = async (where) => {
  const small = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('a, button, input, summary, [role="button"]')) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0 || el.closest('[hidden]')) continue;
      const needed = el.classList.contains('row') ? 56 : 44;
      if (box.height < needed - 0.5 || box.width < 44 - 0.5) {
        bad.push(`${el.tagName} ${el.textContent.trim().slice(0, 20)} ${box.width}x${box.height}`);
      }
    }
    return bad;
  });
  expect(small.length === 0, `touch targets at least 44 px ${where} ${small}`);
};

// ---- The filter in the sheet ----
await page.goto(`${site.url}#/drinks`, { waitUntil: 'load' });
await page.locator('.list-rows li').first().waitFor();
await page.getByRole('button', { name: /^Filters/ }).click();
await page.locator('[data-sheet]').waitFor();
const group = page.locator('.sheet-group[aria-label="Alcohol"]');
await group.waitFor();
const hint = await group.locator('.note').innerText();
expect(
  /calculated/i.test(hint) && /never a legal label/i.test(hint),
  `the sheet says calculated: ${hint}`,
);
expect(
  /12 without alcohol, 73 low ABV, 38 not classified/.test(hint),
  `the sheet counts the classes: ${hint}`,
);
expect(
  !/alcohol[- ]free/i.test(await page.locator('[data-sheet]').innerText()),
  'never "alcohol-free"',
);
await docShot('sheet');
await shot('alcohol-sheet');
await group.getByRole('button', { name: 'Without alcohol (calculated)' }).click();
await waitCount('12 of 639 drinks');
expect(
  (await page.evaluate(() => location.hash)).includes('alcohol=none'),
  'the filter is in the address',
);
await page.getByRole('button', { name: /^Show 12 Drinks/ }).click();
await page.locator('[data-sheet]').waitFor({ state: 'detached' });

// ---- Rows, chip, unclassified ----
const rows = page.locator('.pane.list .list-rows li');
expect((await rows.count()) === 12, 'twelve rows');
for (const row of await rows.all()) {
  expect(
    /Without alcohol \(calculated\)/.test(await row.innerText()),
    'a row says the class in words',
  );
}
expect(
  (await page
    .getByRole('button', { name: 'Remove filter Without alcohol (calculated)' })
    .count()) === 1,
  'the chip names the filter',
);
const unknown = page.locator('[data-unknown-alcohol] summary');
expect(
  (await unknown.innerText()) === '38 could not be classified',
  'the count line links to the unclassified',
);
await unknown.click();
const reasons = await page.locator('[data-unknown-alcohol] h3').allInnerTexts();
expect(
  reasons.join('|') ===
    'The method gives no dilution figure (muddled, layered or no method) (19)|An ingredient has no ABV figure (17)|A line is left out of the figures and may hold alcohol (2)',
  `the reasons: ${reasons}`,
);
expect(
  (await page.locator('[data-unknown-alcohol] li').count()) === 38,
  'every unclassified drink is listed',
);
await noOverflow('with the alcohol filter');
await targets('with the alcohol filter');
await docShot('none');
await shot('alcohol-none');
await unknown.click();

// ---- A search narrows the unclassified too ----
await page.goto(`${site.url}#/drinks?alcohol=none&q=shirley`);
await waitCount('1 of 639 drinks');
expect(
  (await page.locator('[data-unknown-alcohol]').count()) === 0,
  'no unclassified drink matches the search, so no count is shown',
);
await page.goto(`${site.url}#/drinks?alcohol=low`);
await page.locator('.list-rows li').first().waitFor();
await waitCount('73 of 639 drinks');
expect(
  (await page.locator('.pane.list .list-rows li').first().innerText()).includes('Low ABV'),
  'rows of the low filter say Low ABV',
);
await docShot('low');
await shot('alcohol-low');

// ---- Settings: the lines, kept over a reload ----
await page.goto(`${site.url}#/settings`);
await page.getByRole('button', { name: 'Up to 15 %' }).click();
await page.getByRole('button', { name: 'Up to 0.05 %' }).click();
const basis = await page.locator('#alcohol-basis').innerText();
expect(/assumption, unverified/.test(basis), `the basis of the 15 % line is shown: ${basis}`);
await noOverflow('in Settings');
await targets('in Settings');
await docShot('settings');
await shot('alcohol-settings');
await page.reload({ waitUntil: 'load' });
await page.getByRole('button', { name: 'Up to 15 %' }).waitFor();
expect(
  (await page.getByRole('button', { name: 'Up to 15 %' }).getAttribute('aria-pressed')) === 'true',
  'the chosen line is kept over a reload',
);
await page.goto(`${site.url}#/drinks?alcohol=low`);
await page.locator('.list-rows li').first().waitFor();
await waitCount('180 of 639 drinks');
expect(true, 'low ABV up to 15 % lists 180 drinks');
await page.goto(`${site.url}#/drinks?alcohol=none`);
await page.locator('.list-rows li').first().waitFor();
await waitCount('12 of 639 drinks');
expect(true, 'the strict 0.05 % line keeps the same twelve drinks');

expect(external.length === 0, `no request left the origin ${external}`);
await browser.close();
await site.close();
