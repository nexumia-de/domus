// Shelf life with dates the user enters and variant suggestions (#37). A prepared
// ingredient gets a batch with "I made this", the host clock moves and the state
// changes in words; a drink that follows a template offers its variant as a riff.
// The clock is set from outside with Playwright's fixed time; no pauses.
// Screenshots go to dist/walk/; with --docs also to docs/screenshots/ at scale 2
// as shelf-*.png and variants-*.png.
//
//   node e2e/shelf-variants.mjs [width height] [--docs] [--throttle=N] [--slow-frames=MS]
/* global document, location, indexedDB, innerWidth, getComputedStyle -- in functions the page runs */
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
page.on('pageerror', (error) => {
  throw error;
});
await throttle(page, args);

const shot = async (name, selector) => {
  if (selector) {
    await page.evaluate(
      (s) => document.querySelector(s)?.scrollIntoView({ block: 'center' }),
      selector,
    );
  }
  await Promise.all([
    page.screenshot({ path: join(OUT, `${name}-${width}x${height}.png`) }),
    docs ? page.screenshot({ path: join(DOCS, `${name}-${width}x${height}.png`) }) : undefined,
  ]);
};
const open = async (address) => {
  await page.goto('about:blank');
  await page.goto(`${site.url}${address}`, { waitUntil: 'load' });
  await page.locator('.pane h1:visible').last().waitFor({ timeout: 5000 });
};
const sheetClosed = () => page.waitForFunction(() => !location.hash.includes('sheet='));
const dump = () =>
  page.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('mixtura');
        r.onsuccess = () => {
          const names = ['specs', 'ingredients', 'stock'];
          const tx = r.result.transaction(names);
          const out = {};
          let left = names.length;
          for (const n of names) {
            const g = tx.objectStore(n).getAll();
            g.onsuccess = () => {
              out[n] = g.result;
              if (--left === 0) {
                r.result.close();
                res(out);
              }
            };
          }
        };
      }),
  );
const addLine = async (search, amount) => {
  await page.getByRole('button', { name: 'Add Ingredient' }).click();
  const field = page.locator('[data-focus="pick-search"]');
  await field.waitFor();
  await field.fill(search);
  await field.press('Enter');
  await page.locator('.picker-sheet').waitFor({ state: 'detached' });
  await sheetClosed();
  await page.waitForFunction(() =>
    document.activeElement?.getAttribute('data-focus')?.startsWith('amount-'),
  );
  await page.keyboard.type(amount);
};
const pressSave = async () => {
  await page.locator('[data-action="save"]').click();
  const skip = page.locator('[data-action="save-skip"]');
  const done = page.locator('.spec');
  await skip.or(done).first().waitFor({ timeout: 5000 });
  if (await skip.isVisible()) await skip.click();
  await page.locator('.spec').waitFor({ timeout: 5000 });
};
const noOverflow = async (where) => {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(!wide, `no horizontal scrolling ${where}`);
};
const targets = async (where, selector) => {
  const small = await page.evaluate((s) => {
    const bad = [];
    for (const el of document.querySelectorAll(s)) {
      const b = el.getBoundingClientRect();
      if (b.width === 0) continue;
      if (b.height < 43.5 || b.width < 43.5)
        bad.push(`${el.textContent.trim()} ${b.width}x${b.height}`);
    }
    return bad;
  }, selector);
  expect(small.length === 0, `touch targets at least 44 px ${where} ${small}`);
};
/** The host clock is fixed from outside; the app reads it when it draws. */
const clock = async (iso) => {
  await page.clock.setFixedTime(new Date(`${iso}T12:00:00`));
};

// ---- Shelf life with dates ----
await clock('2026-11-17');
await open('#/drinks/new');
await page.locator('input#name').fill('Clock Syrup');
await page.locator('#prepared-toggle').check();
await addLine('simple syrup', '100 ml');
await page.locator('input#yield').fill('100 ml');
await page.locator('input#shelf').fill('10');
await page.locator('input#storage').fill('In the fridge, closed');
await pressSave();
const syrup = (await dump()).ingredients.find((i) => i.name === 'Clock Syrup');
const lineage = (await dump()).specs.find((s) => s.id === syrup.prepared.specId).lineageId;

await open(`#/drinks/${lineage}`);
const card = page.locator('.shelf-card');
await card.waitFor();
expect(
  (await card.locator('[data-shelf-life]').innerText()) === 'Shelf life: 10 days',
  'the shelf life is the one entered',
);
expect(
  (await card.innerText()).includes('Keep: In the fridge, closed'),
  'the storage text is shown',
);
expect(
  (await card.innerText()).includes('No batch recorded'),
  'no batch until the user records one',
);
await shot('shelf-none', '.shelf-card');

await card.locator('[data-action="made-today"]').click();
await card.locator('[data-batch-state]').waitFor();
expect(
  (await card.locator('.shelf-dates').innerText()) === 'Made on 2026-11-17 · use by 2026-11-27',
  `made on and use by (${await card.locator('.shelf-dates').innerText()})`,
);
expect((await card.getAttribute('data-shelf')) === 'fresh', 'fresh on the day it was made');
expect(
  (await card.locator('.shelf-state svg').count()) === 1,
  'the state has a shape as well as words',
);
await noOverflow('on the batch card');
await targets('in the batch card', '.shelf-card button, .shelf-card input');
await shot('shelf-fresh', '.shelf-card');
const stock = (await dump()).stock.find((s) => s.ingredientId === syrup.id);
expect(
  stock.present === true && stock.openedOn === '2026-11-17',
  'the made-on date is the stock record',
);

// The host clock moves: the status changes in words.
await clock('2026-11-25');
await open(`#/drinks/${lineage}`);
await page.locator('.shelf-card [data-batch-state="use-soon"]').waitFor();
expect(
  (await page.locator('.shelf-state').innerText()).includes('Use soon: 2 days left'),
  'two days before: use soon',
);
await shot('shelf-soon', '.shelf-card');
await clock('2026-12-05');
await open(`#/drinks/${lineage}`);
await page.locator('.shelf-card [data-batch-state="past"]').waitFor();
const past = await page.locator('.shelf-state').innerText();
expect(past.includes('Past the date you set by 8 days'), `past, in neutral words (${past})`);
expect(!/expired|spoiled|unsafe|danger|alert/i.test(past), 'no alarm words');
expect(
  (await page.locator('.shelf-state').evaluate((e) => getComputedStyle(e).color)) !==
    'rgb(255, 0, 0)',
  'not red',
);
await shot('shelf-past', '.shelf-card');

// Another day, and Used up with Undo.
await page.locator('#shelf-date').fill('2026-12-01');
await page.locator('[data-action="set-made-on"]').click();
await page.locator('.shelf-card [data-batch-state="fresh"]').waitFor();
expect(
  (await page.locator('.shelf-dates').innerText()) === 'Made on 2026-12-01 · use by 2026-12-11',
  'a date entered by the user',
);
await page.locator('[data-action="used-up"]').click();
await page.locator('.shelf-card[data-shelf="none"]').waitFor();
await page.getByRole('button', { name: 'Undo' }).click();
await page.locator('.shelf-card [data-batch-state]').waitFor();
expect(
  (await page.locator('.shelf-dates').innerText()) === 'Made on 2026-12-01 · use by 2026-12-11',
  'Undo brings the batch back',
);

// ---- Variants ----
await open('#/drinks/daiquiri');
const variant = page.locator('[data-variant="na-sour"]');
await variant.waitFor();
const text = await variant.innerText();
expect(text.includes('Replaces Light Rum with a base of your choice'), `what changes: ${text}`);
expect(text.includes('Carries over Lime juice and Simple Syrup'), 'what is kept');
expect(text.includes('the taste and the balance change'), 'no claim of the same taste');
expect(
  (await variant.getByRole('link').innerText()) === 'Start a Riff as Non-Alcoholic Sour',
  'the button names the variant',
);
await noOverflow('with the variant card');
await targets('in the variant card', '.variant-card a, .variant-card button');
await shot('variants-card', '.variant-card');
await variant.getByRole('link').click();
await page.locator('.editor').waitFor();
expect(
  (await page.locator('.editor').innerText()).includes('Started as Non-alcoholic sour'),
  'the editor says where it started',
);
const names = await page.locator('[data-line-card] .line-ingredient-name').allInnerTexts();
expect(
  names.length === 3 && names[0] === 'Lime juice' && names[1] === 'Simple Syrup',
  `lines carried over and one open (${names})`,
);
expect(
  (await page.locator('select#template').inputValue()) === 'na-sour',
  'the template is the variant',
);
await shot('variants-editor');
// Fill the open base with tea and save.
await page.locator('[data-line-card]').nth(2).locator('.line-ingredient').click();
await page.locator('[data-focus="pick-search"]').fill('black tea');
await page.locator('[data-focus="pick-search"]').press('Enter');
await sheetClosed();
await page.keyboard.type('60 ml');
await page.locator('input#name').fill('Tea Sour');
await pressSave();
const made = (await dump()).specs.find((s) => s.name === 'Tea Sour');
expect(
  made.templateId === 'na-sour' && made.parentId === 'daiquiri' && made.lines.length === 3,
  'saved as a riff on the Daiquiri with the variant template',
);

// A drink whose template has no variant says nothing; a variant drink is not offered itself.
await open('#/drinks/old-fashioned');
await page.locator('.spec').waitFor();
expect((await page.locator('[data-variants]').count()) === 0, 'no card where there is no variant');

await browser.close();
await site.close();
console.log('shelf-variants: done');
