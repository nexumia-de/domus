// Browsing in a real browser: the drinks list with search and filters, the
// templates, the spec screen from the list and from a template, Back, a
// spec with and without a template, a reload with the network off, and the
// numbers for the list (render, search, filters) at the seed size.
// Screenshots go to dist/walk/; with --docs also to docs/screenshots/ at
// scale 2 as app-*.png (the mock-ups' own files are not replaced).
//
//   node e2e/browse.mjs [width height] [--docs]
/* global document, innerWidth, location, window, history, requestAnimationFrame, MutationObserver -- in functions the page runs */
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
page.on('pageerror', (error) => {
  throw error;
});
const external = [];
page.on('request', (request) => {
  if (!request.url().startsWith(site.url) && !request.url().startsWith('data:')) {
    external.push(request.url());
  }
});
// A phone's processor is several times slower than this machine's: the
// phone run measures with a 4x throttle.
if (phone) {
  const client = await context.newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}
await throttle(page, args);
// Marks the moment the first rows are in the page.
await page.addInitScript(() => {
  new MutationObserver((_, observer) => {
    if (document.querySelector('.list-rows li')) {
      window.__firstRows = performance.now();
      observer.disconnect();
    }
  }).observe(document, { childList: true, subtree: true });
});

const shot = (name) => page.screenshot({ path: join(OUT, `${name}-${width}x${height}.png`) });
const docShot = (name) =>
  docs ? page.screenshot({ path: join(DOCS, `app-${name}-${width}x${height}.png`) }) : undefined;
const rows = () => page.locator('.pane.list .list-rows li');
const count = async () => /^(\d+)/.exec(await page.locator('.list-count').innerText())?.[1] ?? '?';
const total = async () => /(\d+) drinks$/.exec(await page.locator('.list-count').innerText())?.[1];
const titleIs = (name) =>
  page
    .locator('.pane h1:visible', { hasText: new RegExp(`^${name}$`) })
    .last()
    .waitFor({ timeout: 5000 });
const hash = () => page.evaluate(() => location.hash);
const waitCount = (n) =>
  page.waitForFunction(
    (want) => {
      const text = document.querySelector('.list-count')?.textContent ?? '';
      return (/^(?:(\d+) of )?(\d+) drinks$/.exec(text)?.[1] ?? /^(\d+)/.exec(text)?.[1]) === want;
    },
    String(n),
    { timeout: 5000 },
  );
const noOverflow = async (where) => {
  const wide = await page.evaluate(() => {
    if (document.documentElement.scrollWidth > innerWidth) return 'page';
    for (const pane of document.querySelectorAll('.pane-scroll')) {
      if (pane.scrollWidth > pane.clientWidth + 1) return 'pane';
    }
    return '';
  });
  expect(wide === '', `no horizontal scrolling ${where} ${wide}`);
};
/** Every visible control is at least 44 x 44 px; list rows at least 56 px high. */
const targets = async (where) => {
  const small = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('a, button, input, summary, [role="button"]')) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (el.closest('[hidden]')) continue;
      const needed = el.classList.contains('row') ? 56 : 44;
      if (box.height < needed - 0.5 || box.width < 44 - 0.5) {
        bad.push(`${el.tagName} ${el.textContent.trim().slice(0, 20)} ${box.width}x${box.height}`);
      }
    }
    return bad;
  });
  expect(small.length === 0, `touch targets at least 44 px ${where} ${small}`);
};

// ---- Drinks list: first paint, numbers ----
await page.goto(`${site.url}#/drinks`, { waitUntil: 'load' });
await rows().first().waitFor();
const firstRows = await page.evaluate(() => Math.round(window.__firstRows));
console.log(`NUMBERS ${width}x${height}${phone ? ' (4x CPU throttle)' : ''}`);
console.log(
  `  first ${await rows().count()} rows in the page: ${firstRows} ms after navigation start`,
);
expect((await rows().count()) === 60, 'the first chunk is 60 rows');
expect((await total()) === '639', 'the list counts 639 drinks');
await noOverflow('on the drinks list');
await targets('on the drinks list');
expect(
  (await page.locator('input[name="q"]').evaluate((el) => document.activeElement === el)) === false,
  'the search field is not focused on open',
);
await docShot('drinks-list');
await shot('browse-list');

// All 639 rows by scrolling.
const scrollAll = await page.evaluate(async () => {
  const pane = document.querySelector('.pane.list .pane-scroll');
  const t0 = performance.now();
  for (
    let i = 0;
    i < 60 && document.querySelectorAll('.pane.list .list-rows li').length < 639;
    i++
  ) {
    pane.scrollTop = pane.scrollHeight;
    await new Promise((done) => requestAnimationFrame(() => setTimeout(done, 0)));
  }
  return {
    ms: Math.round(performance.now() - t0),
    rows: document.querySelectorAll('.pane.list .list-rows li').length,
  };
});
console.log(`  scrolling through all rows: ${scrollAll.rows} rows after ${scrollAll.ms} ms`);
expect(scrollAll.rows === 639, 'scrolling loads all 639 rows');
await page.evaluate(() => {
  document.querySelector('.pane.list .pane-scroll').scrollTop = 0;
});

// ---- Search ----
const input = page.locator('input[name="q"]');
const inHash = (text) =>
  page.waitForFunction((t) => decodeURIComponent(location.hash).includes(t), text, {
    timeout: 5000,
  });
await input.click();
let t0 = Date.now();
await page.keyboard.type('gin', { delay: 20 });
await inHash('q=gin');
const ginCount = Number(await count());
console.log(
  `  typing "gin" until the list shows ${ginCount} hits: ${Date.now() - t0} ms (typing 60 ms and the 200 ms debounce included)`,
);
expect(ginCount > 50 && ginCount < 639, `search "gin" narrows the list to ${ginCount}`);
expect(
  (await input.evaluate((el) => document.activeElement === el)) === true,
  'the search field keeps focus while typing',
);
expect((await input.inputValue()) === 'gin', 'the typed text is kept across the redraw');
const names = await rows().locator('.row-title').allInnerTexts();
expect(
  names.some((n) => /gin/i.test(n)),
  'a drink is found by name',
);
expect((await page.evaluate(() => history.length)) < 10, 'typing adds no history entries');

await input.fill('');
await input.pressSequentially('CREME');
await inHash('q=CREME');
const cremeCount = Number(await count());
expect(
  cremeCount > 0,
  `an accent-free, upper-case search finds ingredients (${cremeCount} drinks)`,
);
await input.fill('');
await input.pressSequentially('Zzzz');
await inHash('q=Zzzz');
await page.getByText('No drink matches the search and filters.').waitFor();
expect(true, 'no hit shows the empty state');
await shot('browse-nohit');
await page.getByRole('button', { name: 'Clear Filters' }).click();
await waitCount(639);
expect((await hash()) === '#/drinks', 'Clear Filters empties the address');
expect((await input.inputValue()) === '', 'and the field');

// ---- Filters ----
await page.getByRole('button', { name: 'Filters', exact: true }).click();
const sheet = page.getByRole('dialog', { name: 'Filters' });
await sheet.waitFor();
expect((await hash()).includes('sheet=filters'), 'the sheet is part of the address');
await page.getByRole('button', { name: /^Martini \(\d+\)/ }).click();
await inHash('template=martini');
expect((await count()) === '57', 'the Martini template filter shows its 57 drinks');
await page.getByRole('button', { name: /^Gin \(\d+\)/ }).click();
await inHash('base=gin');
const martiniGin = Number(await count());
expect(martiniGin > 0 && martiniGin < 57, `combined filters narrow the result (${martiniGin})`);
await page.getByRole('button', { name: '30 % ABV and over' }).click();
t0 = Date.now();
await inHash('strength=ge30');
const strong = Number(await count());
console.log(`  strength filter after two others: ${strong} hits in ${Date.now() - t0} ms`);
expect(strong < martiniGin, `the strength band narrows further (${strong})`);
await docShot('filters');
await shot('browse-filters');
await noOverflow('with the filters sheet');
await targets('in the filters sheet');
await page.getByRole('button', { name: `Show ${strong} Drinks` }).click();
await page.getByRole('dialog').waitFor({ state: 'detached' });
expect(
  (await hash()) === '#/drinks?template=martini&base=gin&strength=ge30',
  `closing the sheet keeps the filters in the address (${await hash()})`,
);
expect(
  (await page.getByRole('button', { name: 'Filters, 3 active' }).count()) === 1,
  'the Filters button counts the active filters',
);
const chips = await page.locator('.pane.list .chips button').allInnerTexts();
expect(
  chips.join('|') === 'Martini template|Base: Gin|30 % ABV and over',
  `active filters are chips: ${chips.join('|')}`,
);
await docShot('drinks-filtered');
await page.getByRole('button', { name: 'Remove filter Base: Gin' }).click();
await inHash('template=martini&strength=ge30');
expect(true, 'a chip removes its filter with one tap');

// Back from the sheet keeps what was set inside it (phone: the sheet is an entry).
await page.getByRole('button', { name: 'Filters, 2 active' }).click();
await sheet.waitFor();
await page.getByRole('button', { name: /^Shake \(\d+\)/ }).click();
await inHash('method=shake');
if (phone) {
  await page.goBack();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  expect((await hash()).includes('method=shake'), 'Back closes the sheet and keeps its filters');
} else {
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  expect((await hash()).includes('method=shake'), 'Escape closes the sheet and keeps its filters');
}
await page.getByRole('button', { name: /^Filters, \d+ active/ }).click();
await sheet.waitFor();
await page.getByRole('button', { name: 'Clear Filters' }).click();
await waitCount(639);
await page.getByRole('button', { name: 'Show 639 Drinks' }).click();
expect((await hash()) === '#/drinks', 'Clear Filters in the sheet empties the address');

// ---- Open a spec from the list, Back, scroll kept ----
await page.evaluate(() => {
  document.querySelector('.pane.list .pane-scroll').scrollTop = 900;
});
await page.waitForTimeout(100);
const before = await page.evaluate(
  () => document.querySelector('.pane.list .pane-scroll').scrollTop,
);
await rows().nth(20).locator('a').click();
await page.locator('.spec').waitFor();
const opened = (await hash()).startsWith('#/drinks/');
expect(opened, `a row opens its spec (${await hash()})`);
await page.locator('.balance').waitFor();
await noOverflow('on a spec');
await targets('on a spec');
await page.getByRole('button', { name: 'Back' }).last().click();
await page.locator('.pane.list .list-rows li').first().waitFor();
await page.waitForTimeout(150);
expect((await hash()) === '#/drinks', 'Back returns to the list');
const after = await page.evaluate(
  () => document.querySelector('.pane.list .pane-scroll').scrollTop,
);
expect(Math.abs(after - before) < 4, `Back restores the list position (${before} -> ${after})`);

// ---- A spec with a template ----
await page.goto(`${site.url}#/drinks/daiquiri`);
await page.locator('.balance').waitFor();
expect(
  (await page.locator('.pane h1:visible').last().innerText()) === 'Daiquiri',
  'the spec is titled by its drink',
);
const body = await page.locator('.spec').innerText();
for (const want of [
  'Daiquiri template',
  'Balance After Shaking',
  'Built-in',
  'Assumed range 17.6\u201319.0 %',
  '22.5 ml',
  'No figure',
  'no acid value',
  'Volume after dilution 131 ml',
  'Ranges come from a model and are not yet checked against a source.',
  'Method',
  'Shake',
]) {
  expect(body.includes(want), `the Daiquiri spec says "${want}"`);
}
expect(
  !/\b(good|bad|wrong|balanced|perfect)\b/i.test(await page.locator('.balance').innerText()),
  'no verdict word',
);
const track = await page.locator('.balance .track').first().getAttribute('aria-label');
expect(/assumed range 17\.6 to 19\.0 %/.test(track), `the track has a text alternative: ${track}`);
expect(
  !/\b(Within|Below|Above)\b/.test(await page.locator('.balance').innerText()),
  'no position word while the range is an assumption',
);
expect(!/Version 1|Draft/.test(body), 'a built-in drink shows no version or status');
await noOverflow('on the Daiquiri spec');
await docShot('spec');
await shot('browse-spec');
await page.locator('.balance').scrollIntoViewIfNeeded();
if (phone) {
  const reachable = await page.evaluate(() => {
    const pane = document.querySelector('.pane.detail .pane-scroll');
    pane.scrollTop = pane.scrollHeight;
    const details = document.querySelector('.balance .disclosure summary').getBoundingClientRect();
    const box = pane.getBoundingClientRect();
    return details.bottom <= box.bottom + 1;
  });
  expect(reachable, 'the whole balance panel is reachable by vertical scroll');
  await docShot('spec-balance');
}
await page.locator('.disclosure summary').click();
await page.getByText('How the figures are computed').waitFor();
expect(true, 'Details opens the notes of the formulas');
await shot('browse-spec-details');

// ---- A spec without a template ----
await page.goto(`${site.url}#/drinks?q=2 to 2`);
await page.locator('.list-rows li').first().waitFor();
await rows().filter({ hasText: '2 to 2' }).first().locator('a').click();
await page.locator('.balance').waitFor();
const noTemplate = await page.locator('.spec').innerText();
expect(noTemplate.includes('No template'), 'a drink without a template says so');
expect(noTemplate.includes('No usual range for this drink'), 'and shows no range comparison');
expect(
  !noTemplate.includes('Within') && !noTemplate.includes('Above'),
  'no position word without a range',
);
expect((await page.locator('.balance .band').count()) === 0, 'no band without a range');
await docShot('spec-no-template');
await noOverflow('on a spec without a template');

// ---- Templates ----
await page.goto(`${site.url}#/templates`);
await page.locator('.list-rows li').first().waitFor();
const templateRows = await page.locator('.pane.list .list-rows li').allInnerTexts();
expect(
  templateRows.length === 10,
  'ten templates (five roots, Sidecar and four alcohol-class variants)',
);
expect(
  templateRows[0].startsWith('Daiquiri') &&
    templateRows[1].startsWith('Non-alcoholic sour') &&
    templateRows[2].startsWith('Sidecar'),
  'variants sit under their parent',
);
expect(
  templateRows[0].includes('Base, Sour, Sweet') && templateRows[0].includes('24 drinks'),
  'a row has roles and the number of drinks',
);
await docShot('templates');
await noOverflow('on the templates');
await targets('on the templates');
await page.locator('.pane.list').getByText('Daiquiri', { exact: true }).click();
await titleIs('Daiquiri');
await page.locator('.slots').waitFor();
expect(
  (await page.locator('.spec').innerText()).includes('Usual range 17.6\u201319.0 %'),
  'the template shows its usual ranges',
);
await docShot('template-detail');
await noOverflow('on a template');
await targets('on a template');
await page.locator('.spec .list-rows li a').nth(2).click();
await page.locator('.balance').waitFor();
expect((await hash()).startsWith('#/drinks/'), 'a drink of a template opens its spec');
await page.getByRole('button', { name: 'Back' }).last().click();
await page.locator('.slots').waitFor();
expect((await hash()) === '#/templates/daiquiri', 'Back returns to the template');
await page.getByRole('link', { name: 'Show in Drinks' }).click();
await page.locator('.list-count').waitFor();
await waitCount(24);
expect(
  (await hash()) === '#/drinks?template=daiquiri',
  'Show in Drinks filters the list to the template',
);
await page.goto(`${site.url}#/templates/flip`);
await page.locator('.spec .list-rows li').first().waitFor();
expect(
  (await page.locator('.spec .list-rows li').count()) === 1,
  'the Flip template lists its one drink',
);
await page.goto(`${site.url}#/templates/nowhere`);
await page.getByRole('heading', { name: 'This template is not here' }).waitFor();
expect(true, 'an unknown template is a status page');
await page.goto(`${site.url}#/drinks/nowhere`);
await page.getByRole('heading', { name: 'This drink is not here' }).waitFor();
expect(true, 'an unknown drink is a status page');

// ---- Cold start with a strength filter: all 639 balances are computed ----
await page.goto(`${site.url}#/drinks?strength=14-22`);
await page.reload({ waitUntil: 'load' });
await rows().first().waitFor();
console.log(
  `  cold start on a strength filter (balance of all 639 drinks): rows in the page after ${await page.evaluate(() => Math.round(window.__firstRows))} ms, ${await count()} hits`,
);

// ---- Offline reload on a spec URL ----
// ---- Servings stepper and batch sheet (#52) ----
await page.goto(`${site.url}#/drinks/daiquiri`);
await page.locator('.balance').waitFor();
const amounts = () => page.locator('.spec .line-amount').allInnerTexts();
expect((await amounts()).join('|') === '60 ml|22.5 ml|22.5 ml', 'one drink: the amounts as stored');
const stepUp = page.getByRole('button', { name: 'One more drink' });
for (let i = 0; i < 3; i += 1) await stepUp.click();
await page.getByText('4 drinks', { exact: true }).waitFor();
expect((await amounts()).join('|') === '240 ml|90 ml|90 ml', `4 drinks: ${await amounts()}`);
expect((await hash()).includes('servings=4'), 'the number of drinks is in the address');
expect(
  (await page.locator('.spec').innerText()).includes('The figures are for one drink.'),
  'the figures say they are for one drink',
);
await noOverflow('on the spec with 4 drinks');
await targets('on the stepper');
await page.getByRole('button', { name: 'Open the batch' }).click();
await page.locator('[data-sheet]').waitFor();
const batchText = await page.locator('[data-sheet]').innerText();
for (const want of [
  'Batch of 4 drinks',
  'Water to add',
  'Total volume',
  'Pour per serving',
  '131 ml',
  'Yield',
  '4 servings',
  'Shelf life',
  'Unknown',
  'Water is the dilution of shaking',
]) {
  expect(batchText.includes(want), `the batch sheet says "${want}"`);
}
await noOverflow('with the batch sheet open');
await docShot('spec-batch');

// A batch for a volume, and more than 12 drinks (#80).
const batchDialog = page.getByRole('dialog');
const field = batchDialog.getByLabel(/^(Number of drinks|Target volume)$/);
const setField = async (text) => {
  await field.fill(text);
  await field.press('Enter');
};
await batchDialog.getByRole('button', { name: 'Volume', exact: true }).click();
await page.waitForFunction(() => location.hash.includes('volume=530'));
expect(
  (await batchDialog.innerText()).includes('Batch of 530 ml'),
  "Volume starts from today's batch (4 drinks make 530 ml)",
);
await setField('1 l');
await page.waitForFunction(() => location.hash.includes('volume=1000'));
const volumeText = await batchDialog.innerText();
for (const want of ['Batch of 1000 ml', 'Servings', '7.6 of 131 ml', 'Pour per serving']) {
  expect(volumeText.includes(want), `the volume batch says "${want}"`);
}
await noOverflow('with the volume batch');
await targets('in the batch sheet');
await docShot('spec-batch-volume');
await shot('spec-batch-volume');
await setField('abc');
expect(
  (await batchDialog.getByRole('alert').innerText()).includes('Enter a volume above 0'),
  'a volume that is not one is said under the field',
);
expect((await field.inputValue()) === 'abc', 'and the typed text stays');
expect((await hash()).includes('volume=1000'), 'the address is unchanged');
await setField('50');
await page.waitForFunction(() => location.hash.includes('volume=50'));
expect(
  (await batchDialog.innerText()).includes('less than one serving'),
  'a volume below one serving says so',
);
await batchDialog.getByRole('button', { name: 'Drinks', exact: true }).click();
await page.waitForFunction(() => !location.hash.includes('volume='));
expect((await hash()).includes('servings=4'), 'Drinks brings the number of drinks back');
await setField('40');
await page.waitForFunction(() => location.hash.includes('servings=40'));
expect(
  (await batchDialog.innerText()).includes('Batch of 40 drinks'),
  'the sheet makes a batch of more than 12 drinks',
);
await setField('201');
expect(
  (await batchDialog.getByRole('alert').innerText()).includes('whole number'),
  'more than 200 drinks is refused',
);
await setField('4');
await page.waitForFunction(() => location.hash.includes('servings=4'));
await page.getByRole('button', { name: 'Close the batch' }).click();
await page.locator('[data-sheet]').waitFor({ state: 'detached' });
expect(!(await hash()).includes('sheet='), 'closing the sheet leaves the address of the drink');
await page.reload({ waitUntil: 'load' });
await page.locator('.balance').waitFor();
expect((await amounts())[0] === '240 ml', 'the number of drinks survives a reload');
if (phone) {
  await page.getByRole('button', { name: 'Open the batch' }).click();
  await page.locator('[data-sheet]').waitFor();
  await page.goBack();
  await page.locator('[data-sheet]').waitFor({ state: 'detached' });
  expect((await hash()).includes('servings=4'), 'Back closes the sheet and keeps the drinks');
}
await docShot('spec-servings');

// ---- Lines not counted, what-if volume of a top (#74) ----
await page.goto(`${site.url}#/drinks/mojito`);
await page.locator('.balance').waitFor();
const notCounted = page.locator('[data-not-counted]');
const listed = await notCounted.innerText();
expect(
  /Top Club soda: no volume given/.test(listed) &&
    /6 sprigs Mint: no volume known per unit/.test(listed),
  `the lines not counted are listed with the reason: ${listed}`,
);
const volumeBefore = await page.locator('.metric-volume').innerText();
await page.getByRole('button', { name: 'Add Volume' }).click();
const volumeField = page.getByLabel('Volume of the top');
await volumeField.waitFor();
await volumeField.fill('abc');
await page.getByRole('button', { name: 'Set', exact: true }).click();
expect(
  (await page.locator('.line-volume [role=alert]').innerText()).includes('Enter a volume'),
  'a text that is no volume is refused with a reason',
);
await volumeField.fill('90');
await page.getByRole('button', { name: 'Set', exact: true }).click();
await page.locator('.line-amount', { hasText: 'Top, 90 ml' }).waitFor();
const volumeAfter = await page.locator('.metric-volume').innerText();
expect(
  volumeAfter !== volumeBefore,
  `the what-if volume changes the figures: ${volumeBefore} -> ${volumeAfter}`,
);
expect(
  !/Club soda/.test(await notCounted.innerText()) && /Mint/.test(await notCounted.innerText()),
  'the top leaves the not-counted list, the mint stays',
);
expect(
  (await page.locator('.spec').innerText()).includes('What-if, not saved'),
  'and says it is not saved',
);
await noOverflow('on the what-if spec');
await docShot('spec-not-counted');
await page.reload({ waitUntil: 'load' });
await page.locator('.balance').waitFor();
expect(
  /no volume given/.test(await page.locator('[data-not-counted]').innerText()),
  'a what-if volume is gone after a reload',
);
await targets('on the spec with a top');

await page.goto(`${site.url}#/drinks/daiquiri`);
await page.locator('.balance').waitFor();
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
await context.setOffline(true);
await page.reload({ waitUntil: 'load' });
await page.locator('.balance').waitFor();
expect(
  (await page.locator('.pane h1:visible').last().innerText()) === 'Daiquiri',
  'a spec URL reloads with the network off',
);
expect((await page.locator('.spec').innerText()).includes('Assumed range'), 'with its figures');
await context.setOffline(false);

expect(external.length === 0, `no request left the origin ${external}`);
await browser.close();
await site.close();
