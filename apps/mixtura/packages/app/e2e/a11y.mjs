/* global document, getComputedStyle, innerWidth, location, MutationObserver -- in functions the page runs */
// Accessibility pass in a real browser (docs/accessibility.md): every screen
// at the given size in light and dark, then reduced motion and 200 % zoom.
// The test injects a style rule for the 200 % zoom, so this context bypasses the page policy (e2e/csp.mjs covers it).
// Hand-written checks, no library: accessible names from the browser's
// own accessibility tree, focus visibility and order by pressing Tab,
// contrast computed from the rendered colours.
//
//   node e2e/a11y.mjs [width height]
import { launch, throttle } from './browser.mjs';
import { audit } from './a11y-audit.mjs';
import { focusWalk, namelessControls } from './a11y-focus.mjs';
import { expect, serve } from './serve.mjs';

const args = process.argv.slice(2);
const [width = 1200, height = 800] = args.filter((a) => /^\d+$/.test(a)).map(Number);
const site = await serve();
const browser = await launch();

/** Each screen: name, how to reach it. A hash alone is not enough for sheets. */
const scenes = [
  ['drinks', '#/drinks'],
  ['drinks-filters', '#/drinks?sheet=filters'],
  ['spec', '#/drinks/daiquiri'],
  ['spec-batch', '#/drinks/daiquiri?sheet=batch'],
  ['spec-swap', '#/drinks/daiquiri?swap='],
  ['spec-swap-sheet', '#/drinks/daiquiri?swap=&sheet=line-0'],
  ['editor', '#/drinks/new', editorFilled],
  ['editor-error', '#/drinks/new', editorError],
  ['editor-ingredient-form', '#/drinks/new', ingredientForm],
  ['templates', '#/templates'],
  ['template', '#/templates/daiquiri'],
  ['stock', '#/stock'],
  ['stock-spaces', '#/stock?sheet=spaces'],
  ['buy-next', '#/stock/buy-next'],
  ['settings', '#/settings'],
  ['data', '#/settings/data'],
  ['spec-share', '#/drinks', specShare],
  ['share-preview', '#/drinks', sharePreview],
  ['about', '#/about'],
  ['not-found', '#/nowhere'],
];

async function editorFilled(page) {
  await page.locator('select#template').selectOption({ label: 'Daiquiri' });
  await page.locator('input#name').fill('Test Daiquiri');
}

async function editorError(page) {
  await editorFilled(page);
  await page.locator('[data-line-card] .line-ingredient').first().click();
  await page.locator('[data-focus="pick-search"]').fill('light rum');
  await page.locator('[data-focus="pick-search"]').press('Enter');
  await page.waitForFunction(() => !location.hash.includes('sheet='));
  await page.keyboard.type('blah');
  await page.keyboard.press('Tab');
  await page.locator('[data-line-card] [role="alert"]').first().waitFor();
}

async function ingredientForm(page) {
  await page.locator('select#template').selectOption({ label: 'Daiquiri' });
  await page.locator('[data-line-card] .line-ingredient').first().click();
  await page.locator('[data-focus="pick-search"]').fill('hibiscus tea');
  await page.getByRole('button', { name: /^Create “hibiscus tea”/ }).click();
  await page.locator('.ingredient-sheet').waitFor();
  await page.locator('#f-name').fill('');
  await page.locator('#f-name').blur();
}

// The share screens need data (an own drink). Every step looks at the page and
// makes only what is missing, because one browser context serves all scenes of
// a pass. No step navigates the document (the zoom pass injects a style rule
// first): clicks and the address hash only.
const DRINK = 'Accessible Test Drink';

async function ensureDrink(page) {
  await page.evaluate(() => (location.hash = '#/drinks'));
  await page.locator('.pane h1:visible').last().waitFor();
  await quiet(page);
  const row = page.locator('a.row', { hasText: DRINK }).first();
  if ((await row.count()) === 0) {
    await page.evaluate(() => (location.hash = '#/drinks/new'));
    await page.locator('select#template').waitFor();
    await page.locator('select#template').selectOption({ label: 'Daiquiri' });
    await page.locator('input#name').fill(DRINK);
    const names = ['light rum', 'lime juice', 'simple syrup'];
    for (const name of names) {
      const empty = page.locator('[data-line-card]', { hasText: 'Empty line from the template' });
      if ((await empty.count()) === 0) break;
      await empty.first().locator('.line-ingredient').click();
      await page.locator('[data-focus="pick-search"]').fill(name);
      await page.locator('[data-focus="pick-search"]').press('Enter');
      await page.waitForFunction(() => !location.hash.includes('sheet='));
    }
    const amounts = page.locator('[data-line-card] input[name="amount"]');
    for (let i = 0; i < 3; i++) await amounts.nth(i).fill('20 ml');
    await page.locator('[data-action="save"]').click();
    await page.locator('.spec').waitFor({ timeout: 5000 });
    return;
  }
  await row.click();
  await page.locator('.spec').waitFor();
}

async function specShare(page) {
  await ensureDrink(page);
  // The toast of the save sits over the sheet's lower part until it times out.
  await page.locator('[data-testid="toast"]').waitFor({ state: 'detached', timeout: 15000 });
  await page.locator('[data-focus="share"]').click();
  await page.locator('[data-testid="share-link"]').waitFor();
  await quiet(page);
}

async function sharePreview(page) {
  await specShare(page);
  const link = await page.locator('[data-testid="share-link"]').inputValue();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.locator('[data-testid="share-sheet"]').waitFor({ state: 'detached' });
  await page.evaluate((hash) => (location.hash = hash), link.slice(link.indexOf('#')));
  await page.locator('[data-testid="import-preview"]').waitFor({ timeout: 5000 });
  await quiet(page);
}

const open = async (page, address) => {
  await page.goto('about:blank');
  await page.goto(`${site.url}${address}`, { waitUntil: 'load' });
  await page.locator('.pane h1:visible').last().waitFor({ timeout: 5000 });
  await quiet(page);
};

/** Waits until the page stops changing: the first draw, the data and the rows are in. */
const quiet = (page) =>
  page.evaluate(
    () =>
      new Promise((done) => {
        let timer;
        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(finish, 500);
        });
        const finish = () => {
          observer.disconnect();
          done();
        };
        observer.observe(document.body, { subtree: true, childList: true, attributes: true });
        timer = setTimeout(finish, 500);
      }),
  );

/**
 * Findings that are written down as issues because their fix lies in code
 * another change is working on. Each is printed, not failed on; delete the
 * entry with the fix.
 */
const known = [];
const problems = [];
const report = (where, list) => {
  for (const text of list) {
    const line = `${where}: ${text}`;
    const issue = known.find((k) => k.match.test(line));
    if (issue) console.log(`known (#${issue.issue}): ${line}`);
    else problems.push(line);
  }
};

const newPage = async (options) => {
  const context = await browser.newContext({
    viewport: { width, height },
    bypassCSP: true,
    ...options,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => {
    throw error;
  });
  await throttle(page, args);
  return page;
};

for (const scheme of ['light', 'dark']) {
  const page = await newPage({ colorScheme: scheme });
  for (const [name, address, prepare] of scenes) {
    const where = `${name} ${width}x${height} ${scheme}`;
    await open(page, address);
    if (prepare) await prepare(page);
    report(where, await audit(page));
    report(where, await namelessControls(page));
    report(where, await focusWalk(page));
  }
  await page.context().close();
}
if (problems.length > 0) console.log(problems.join('\n'));
expect(problems.length === 0, `accessibility pass over ${scenes.length} screens x 2 themes`);

// Reduced motion: no transition, no animation, no smooth scrolling anywhere.
{
  const page = await newPage({ reducedMotion: 'reduce' });
  const moving = [];
  for (const [name, address, prepare] of scenes) {
    await open(page, address);
    if (prepare) await prepare(page);
    moving.push(
      ...(
        await page.evaluate(() => {
          const bad = new Set();
          for (const el of document.querySelectorAll('*')) {
            const s = getComputedStyle(el);
            const long = (list) => list.split(',').some((d) => parseFloat(d) > 0);
            if (long(s.transitionDuration) && s.transitionProperty !== 'none')
              bad.add(`transition on ${el.tagName}.${el.className}`);
            if (long(s.animationDuration) && s.animationName !== 'none')
              bad.add(`animation on ${el.tagName}.${el.className}`);
            if (s.scrollBehavior === 'smooth') bad.add(`smooth scroll on ${el.tagName}`);
          }
          return [...bad];
        })
      ).map((text) => `${name}: ${text}`),
    );
  }
  expect(moving.length === 0, `prefers-reduced-motion stops all motion ${moving.slice(0, 5)}`);
  await page.context().close();
}

// 200 %: the page at half the width and height with twice the pixels, and the
// text at twice its size at the full width. Nothing may need sideways scrolling
// or be cut off.
const overflow = () => ({
  page: document.documentElement.scrollWidth > innerWidth,
  clipped: [...document.querySelectorAll('.pane-scroll, .sheet-scroll, .nav')]
    .filter((el) => el.scrollWidth > el.clientWidth + 1)
    .map((el) => `${el.className} ${el.scrollWidth}>${el.clientWidth}`),
  wide: [...document.querySelectorAll('body *')]
    .filter(
      (el) =>
        el.getBoundingClientRect().right > innerWidth + 1 && el.getBoundingClientRect().width > 0,
    )
    .slice(0, 3)
    .map(
      (el) => `${el.tagName}.${el.className} right=${Math.round(el.getBoundingClientRect().right)}`,
    ),
});
const zoomed = [];
// A phone is already at the narrowest window (360 px, 100 %): page zoom is for the desktop size.
const zooms = [['text size', {}, true]];
if (width >= 840) {
  zooms.unshift([
    'page zoom',
    { viewport: { width: Math.round(width / 2), height: Math.round(height / 2) } },
    false,
  ]);
}
for (const [label, options, text] of zooms) {
  const page = await newPage(options);
  for (const [name, address, prepare] of scenes) {
    await open(page, address);
    if (text) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    if (prepare) await prepare(page);
    const wide = await page.evaluate(overflow);
    if (wide.page || wide.clipped.length > 0) {
      const line = `${label} ${name}: ${JSON.stringify(wide)}`;
      const issue = known.find((k) => k.match.test(line));
      if (issue) console.log(`known (#${issue.issue}): ${line}`);
      else zoomed.push(line);
    }
  }
  await page.context().close();
}
if (zoomed.length > 0) console.log(zoomed.join('\n'));
expect(zoomed.length === 0, `200 % without sideways scrolling`);

await browser.close();
await site.close();
process.exit(problems.length + zoomed.length > 0 ? 1 : 0);
