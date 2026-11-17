// Try a Swap in a real browser: start swap mode on the Daiquiri, swap an
// ingredient by role, change an amount (typed, stepped, refused), watch the
// figures and the template change, reset with Undo, leave and come back,
// a drink without a template, a line without a role, the on-screen keyboard
// case, and that nothing is stored. Screenshots go to dist/walk/; with
// --docs also to docs/screenshots/ at scale 2 as swap-*.png.
//
//   node e2e/swap.mjs [width height] [--docs]
/* global document, indexedDB, innerWidth, location, history, getComputedStyle, requestAnimationFrame -- in functions the page runs */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, throttle } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const args = process.argv.slice(2);
const docs = args.includes('--docs');
const [width = 1200, height = 800] = args.filter((a) => /^\d+$/.test(a)).map(Number);
const phone = width < 840;
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

const shot = (name) =>
  Promise.all([
    page.screenshot({ path: join(OUT, `swap-${name}-${width}x${height}.png`) }),
    docs ? page.screenshot({ path: join(DOCS, `swap-${name}-${width}x${height}.png`) }) : undefined,
  ]);
const hash = () => page.evaluate(() => decodeURIComponent(location.hash));
const open = async (address) => {
  // A fresh document: a hash change alone would be a navigation inside the app.
  await page.goto('about:blank');
  await page.goto(`${site.url}${address}`, { waitUntil: 'load' });
  await page.locator('.pane h1:visible').last().waitFor({ timeout: 5000 });
};
const abv = () => page.locator('.balance .metric[aria-label="ABV"] .metric-value').innerText();
const change = (key) => page.locator(`[data-change="${key}"]`).innerText();
const noOverflow = async (where) => {
  const wide = await page.evaluate(() => {
    if (document.documentElement.scrollWidth > innerWidth) return 'page';
    for (const pane of document.querySelectorAll('.pane-scroll, .sheet-scroll')) {
      if (pane.scrollWidth > pane.clientWidth + 1) return 'pane';
    }
    return '';
  });
  expect(wide === '', `no horizontal scrolling ${where} ${wide}`);
};
const targets = async (where) => {
  const small = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('a, button, input, summary')) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      // Text links inside running text and the list pane's rows are not swap controls.
      if (el.closest('.pane.list') || el.closest('.nav')) continue;
      if (box.height < 43.5 || box.width < 43.5) {
        bad.push(`${el.tagName} ${el.textContent.trim().slice(0, 20)} ${box.width}x${box.height}`);
      }
    }
    return bad;
  });
  expect(small.length === 0, `touch targets at least 44 px ${where} ${small}`);
};
const stored = () =>
  page.evaluate(async () => {
    const out = { local: JSON.stringify({ ...localStorage }), stores: {} };
    for (const { name } of await indexedDB.databases()) {
      const db = await new Promise((done, fail) => {
        const r = indexedDB.open(name);
        r.onsuccess = () => done(r.result);
        r.onerror = () => fail(r.error);
      });
      for (const store of db.objectStoreNames) {
        out.stores[`${name}/${store}`] = await new Promise((done) => {
          const r = db.transaction(store).objectStore(store).count();
          r.onsuccess = () => done(r.result);
        });
      }
      db.close();
    }
    return JSON.stringify(out);
  });
const line = (index) => page.locator(`button.line-hit[data-line="${index}"]`);
const sheet = () => page.locator('.swap-sheet');
const toast = () => page.getByTestId('toast');
const amountField = () => page.locator('#swap-amount');
const settle = () => page.waitForTimeout(150);

// ---- Start ----
await open('#/drinks/daiquiri');
const before = await stored();
const savedAbv = await abv();
expect(
  (await page.locator('.swap-banner').count()) === 0,
  'the spec screen is not in swap mode by default',
);
expect(
  (await page.locator('button.line-hit').count()) === 0,
  'lines are not tappable outside swap',
);
await page.getByRole('button', { name: 'Try a swap on this drink' }).click();
await page.getByText('Trying a swap. Change a line to see the numbers.').waitFor();
expect((await hash()) === '#/drinks/daiquiri?swap=', 'swap mode is an address, with nothing in it');
expect(
  (await page.getByRole('button', { name: 'Reset all lines to the saved drink' }).isDisabled()) ===
    true,
  'Reset is disabled while nothing is changed',
);
expect((await page.locator('button.line-hit').count()) === 3, 'every line is a button');
await noOverflow('in swap mode');
await targets('in swap mode');
await shot('start');

// ---- Swap an ingredient by role ----
await line(0).click();
await sheet().waitFor();
expect((await hash()).includes('sheet=line-0'), 'the line sheet is part of the address');
expect(
  (await sheet().getByRole('heading', { name: 'Change Light Rum' }).count()) === 1,
  'the sheet names the line',
);
const groupLabel = await sheet().locator('[data-group]').first().getAttribute('aria-label');
expect(groupLabel === 'Same role', `offers come as a group by role (${groupLabel})`);
const offers = await sheet().locator('[data-group="role"] .offer-name').allInnerTexts();
expect(
  offers.length === 8 && !offers.includes('Light Rum'),
  `eight offers, the line itself not among them (${offers.slice(0, 4)}...)`,
);
expect(
  /rum/i.test(offers[0] ?? ''),
  `the nearest offer is a rum, ordered by tree distance (${offers[0]})`,
);
await sheet()
  .getByRole('button', { name: /^Show \d+ more$/ })
  .click();
await settle();
expect(
  (await sheet().locator('[data-group="role"] .offer').count()) > 20,
  'Show more shows the whole group',
);
await sheet().getByRole('button', { name: 'Show fewer' }).click();
const first = offers[0];
await sheet().locator('[data-group="role"] .offer').first().click();
await settle();
expect(
  (await sheet()
    .getByRole('heading', { name: `Change ${first}` })
    .count()) === 1,
  'the sheet follows the choice',
);
expect(
  (await sheet().locator('.offer.is-selected').count()) === 1,
  'the chosen offer is marked with text and shape',
);
expect((await hash()).includes(`swap=0:`), 'the swap is in the address');
const swappedAbv = await abv();
expect((await change('abv')).startsWith('Was '), 'the ABV row shows the change');
expect(
  (await change('abv')).includes(savedAbv),
  `the change row names the saved figure ${savedAbv}: ${await change('abv')}`,
);
await shot('sheet-ingredient');

// ---- Search over all ingredients ----
await sheet().locator('input[name="ingredient-search"]').fill('tequila');
await settle();
const hit = sheet().locator('.offer', { hasText: 'Tequila Blanco' });
expect((await hit.count()) === 1, 'the search finds an ingredient outside the role group');
await hit.click();
await settle();
expect(
  (await hash()).includes('swap=0:tequila-blanco:'),
  `the found ingredient is swapped in (${await hash()})`,
);
await sheet().locator('input[name="ingredient-search"]').fill('zzzz');
await settle();
await sheet().getByText('No ingredient matches.').waitFor();
expect(true, 'no hit says so calmly');
await sheet().locator('input[name="ingredient-search"]').fill('');

// ---- Amount: typed, refused, stepped ----
await sheet().getByRole('button', { name: 'Done' }).click();
await sheet().waitFor({ state: 'detached' });
expect(
  (await hash()).includes('swap=0:tequila-blanco:') && !(await hash()).includes('sheet='),
  'Done closes the sheet and keeps the swap',
);
await line(1).click();
await sheet().waitFor();
expect((await amountField().inputValue()) === '22.5 ml', 'the field starts with the line amount');
await settle();
const firstWord = await page.evaluate(() => document.activeElement?.getAttribute('data-sheet'));
expect(firstWord === '', 'the sheet is focused, not the amount field (no keyboard pops up)');
await amountField().fill('1 oz');
await settle();
expect((await hash()).includes('1:'), 'a valid amount applies while typing');
await page.getByText('= 30 ml').waitFor();
expect(true, 'what was understood is shown in ml');
expect((await amountField().inputValue()) === '1 oz', 'the typed text is kept');
await amountField().fill('blah');
await amountField().blur();
await page.getByText(/^Not understood: blah\./).waitFor();
expect(true, 'a text that is no amount is said calmly in place');
expect((await hash()).includes('::1oz_us'), 'and the last valid amount stays');
await amountField().fill('3/4 oz');
await settle();
await page.getByRole('button', { name: 'Larger amount' }).click();
await settle();
expect((await amountField().inputValue()).length > 0, 'the stepper rewrites the field');
expect((await hash()).includes('::0.75oz_us') === false, 'one step up leaves 3/4 oz (22.5 ml)');
await page.getByRole('button', { name: 'Smaller amount' }).click();
await settle();
expect(
  (await hash()).includes('1:') === false || (await hash()).includes('swap=0:tequila-blanco:,'),
  'stepping back to the saved amount clears the change of that line',
);
await amountField().fill('1,5 oz');
await settle();
expect((await hash()).includes('1oz_us') || (await hash()).includes('1.5oz_us'), 'decimal comma');
const redraw = await page.evaluate(async () => {
  const times = [];
  for (let i = 0; i < 10; i++) {
    const button = document.querySelector('[data-focus="swap-up"]');
    const t0 = performance.now();
    button.click();
    await new Promise((done) => requestAnimationFrame(() => setTimeout(done, 0)));
    times.push(performance.now() - t0);
  }
  return Math.round(Math.max(...times));
});
console.log(
  `NUMBERS ${width}x${height}: a swap step, recompute and redraw: ${redraw} ms (worst of 10)`,
);
// The budget is for the plain run: --slow-frames delays the very frame the
// measurement waits for, so a throttled run only prints the number.
const slowRun = args.some((a) => a.startsWith('--throttle=') || a.startsWith('--slow-frames='));
expect(slowRun || redraw < 50, 'a swap step recomputes and redraws in under 50 ms');
await shot('sheet-amount');
await sheet().getByRole('button', { name: 'Reset Line' }).click();
await settle();
expect(
  !(await hash()).includes('swap=0:tequila-blanco:,1'),
  'Reset Line takes this line back to the saved spec',
);
await sheet().getByRole('button', { name: 'Done' }).click();
await sheet().waitFor({ state: 'detached' });

// ---- Figures, template ----
const text = await page.locator('.pane-scroll').last().innerText();
expect(/Was [\d.]+ % → now [\d.]+ %/.test(text), 'before → after is shown as numbers');
expect(
  !/\b(good|bad|wrong|balanced|perfect|score|grade|warning)\b/i.test(text),
  'no verdict words on the screen',
);
expect(
  (await page.locator('.line.is-changed .line-changed').first().innerText()).startsWith(
    'Changed, was 60 ml Light Rum',
  ),
  'the changed line says what it was',
);
expect(
  (await page.locator('[data-was]').count()) <= (await page.locator('.balance .track').count()),
  'a tick only on a track',
);
if (phone) {
  expect(await page.locator('[data-compact]').isVisible(), 'the compact bar is shown on a phone');
  expect((await page.locator('[data-compact]').innerText()).includes('ABV'), 'with the figures');
} else {
  expect(
    !(await page.locator('[data-compact]').isVisible()),
    'the compact bar is hidden where the panel is beside the lines',
  );
}
await line(2).click();
await sheet().locator('input[name="ingredient-search"]').fill('triple sec');
await settle();
await sheet().locator('.offer', { hasText: 'Triple Sec' }).first().click();
await settle();
await sheet().getByRole('button', { name: 'Done' }).click();
await sheet().waitFor({ state: 'detached' });
const note = page.locator('[data-template-change]');
await note.waitFor();
const noteText = await note.innerText();
expect(
  /^Now matches (the .+ template|no template)\. Before: Daiquiri\.$/.test(noteText),
  `the template change is said plainly: ${noteText}`,
);
await shot('changed');
await noOverflow('with a swap');
await targets('with a swap');

// ---- Reset with Undo ----
await page.getByRole('button', { name: 'Reset all lines to the saved drink' }).click();
await settle();
expect((await hash()) === '#/drinks/daiquiri?swap=', 'Reset returns to the saved spec');
expect((await abv()) === savedAbv, 'and to the saved figures');
expect(
  (await page.locator('[data-change]').first().innerText()).endsWith('(no change)'),
  'figures say no change',
);
await toast().getByRole('button', { name: 'Undo' }).click();
await settle();
expect((await hash()).includes('swap=0:tequila-blanco'), 'Undo brings the swap back');
const swappedHash = await hash();

// ---- Leave and come back ----
const swappedAbvNow = await abv();
await page.locator('.tags a.tag--link').first().click();
await page.waitForFunction(() => location.hash.startsWith('#/templates/'));
await page.goBack();
await page.waitForFunction((h) => decodeURIComponent(location.hash) === h, swappedHash);
expect((await abv()) === swappedAbvNow, 'going to the template and back keeps the swap');
await page.reload({ waitUntil: 'load' });
await page.locator('.swap-banner').waitFor();
expect((await abv()) === swappedAbvNow, 'a reload applies the swap of the address');
expect(swappedAbv !== undefined, 'figures read');

// ---- Servings and batch in swap mode ----
await page.getByRole('button', { name: 'One more drink' }).click();
await settle();
expect(
  (await hash()).includes('servings=2') && (await hash()).includes('swap='),
  'servings keep the swap',
);
await page.getByRole('button', { name: 'Open the batch' }).click();
await page.getByRole('dialog', { name: 'Batch of 2 drinks' }).waitFor();
expect(
  (await page.getByRole('dialog').innerText()).includes('Tequila Blanco'),
  'the batch is made from the swapped lines',
);
await page.getByRole('button', { name: 'Close the batch' }).click();
await page.getByRole('button', { name: 'One fewer drink' }).click();
await settle();

// ---- Back drops the swap with Undo ----
const pushed = await page.evaluate(() => history.length);
await page.getByRole('button', { name: 'Back', exact: true }).click();
await toast().getByText('Swap dropped').waitFor();
expect(!(await hash()).includes('swap'), 'Back leaves swap mode');
await toast().getByRole('button', { name: 'Undo' }).click();
await page.waitForFunction(() =>
  decodeURIComponent(location.hash).includes('swap=0:tequila-blanco'),
);
expect(pushed > 0, 'Undo opens the dropped swap again');

// ---- Nothing stored ----
expect((await stored()) === before, 'IndexedDB and local storage are untouched by swaps');

// ---- An amount only: same template, same ranges, ticks for the saved values ----
await open('#/drinks/daiquiri?swap=2::25ml');
await page.locator('.swap-banner').waitFor();
expect(
  (await page.locator('[data-was]').count()) === 2,
  'the saved ABV and sugar are dotted ticks (acid is unknown in the seed)',
);
expect(
  (await page.locator('[data-template-change]').count()) === 0,
  'a small amount change keeps the template',
);
expect((await change('sugar')).includes('\u2192 now'), `sugar: ${await change('sugar')}`);
await shot('amount');

// ---- A drink without a template; a line without a role ----
await open('#/drinks/bellini?swap=');
await page.locator('.tags .tag', { hasText: 'No template' }).waitFor();
await line(0).click();
await sheet().waitFor();
await amountField().fill('150 ml');
await settle();
await sheet().getByRole('button', { name: 'Done' }).click();
await sheet().waitFor({ state: 'detached' });
expect(
  (await change('abv')).startsWith('Was '),
  'a drink without template still shows before → now',
);
expect((await page.locator('.balance .track').count()) === 0, 'and draws no range');
expect(
  (await page.locator('[data-template-change]').count()) === 0,
  'and says nothing about templates',
);
expect((await change('acid')) === 'Was No figure → now No figure', 'unknown acid stays unknown');
await shot('no-template');
await line(1).click();
await sheet().waitFor();
await sheet().getByText('This ingredient has no role in the data.').waitFor();
const groups = await sheet().locator('[data-group]').count();
expect(true, `a line without a role: ${groups} groups offered, the search is there`);
await sheet().locator('input[name="ingredient-search"]').fill('mango');
await settle();
expect((await sheet().locator('.offer').count()) > 0, 'the search covers the role-less line');
await shot('no-role');
await sheet().locator('.offer').first().click();
await settle();
expect((await hash()).includes(',1:'), 'a role-less line can be swapped');
await sheet().getByRole('button', { name: 'Done' }).click();
await open('#/drinks/banana-daiquiri?swap=');
const iceIndex = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('button.line-hit')];
  return rows.findIndex((r) => /Crushed Ice/i.test(r.textContent));
});
await line(iceIndex).click();
await sheet().waitFor();
await sheet().locator('[data-no-offers]').waitFor();
expect(true, 'a line nothing is known for says: search all ingredients');
await targets('in the line sheet');
await noOverflow('in the line sheet');

// ---- On-screen keyboard ----
await open('#/drinks/daiquiri?swap=');
await line(1).click();
await sheet().waitFor();
await amountField().focus();
const covered = Math.round(height / 2);
await page.evaluate(
  (px) => document.documentElement.style.setProperty('--kb-inset', `${px}px`),
  covered,
);
await settle();
const inside = await page.evaluate((limit) => {
  const field = document.querySelector('#swap-amount').getBoundingClientRect();
  const box = document.querySelector('.swap-sheet').getBoundingClientRect();
  return { fieldBottom: field.bottom, fieldTop: field.top, sheetBottom: box.bottom, limit };
}, height - covered);
expect(
  inside.fieldTop >= 0 &&
    inside.fieldBottom <= inside.limit &&
    inside.sheetBottom <= inside.limit + 1,
  `with half the height covered the amount field stays visible (${JSON.stringify(inside)})`,
);
await shot('keyboard');
await page.evaluate(() => document.documentElement.style.removeProperty('--kb-inset'));
await page.keyboard.press('Escape');
await sheet().waitFor({ state: 'detached' });
expect(
  (await page.locator('.swap-banner').count()) === 1,
  'Escape closes the sheet and stays in swap mode',
);

// ---- Wide: sheet is a replace, not a history entry ----
if (!phone) {
  const length = await page.evaluate(() => history.length);
  await line(0).click();
  await sheet().waitFor();
  expect(
    (await page.evaluate(() => history.length)) === length,
    'on desktop the sheet adds no history entry',
  );
  await page.keyboard.press('Escape');
}

await browser.close();
await site.close();
