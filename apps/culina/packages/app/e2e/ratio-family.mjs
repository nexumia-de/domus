// Ratio families of the seed: a card links to its parent and variations, and the browser's back returns.
import { check, watch } from './harness.mjs';
import { FORBIDDEN, overflow, smallTargets } from './measure.mjs';

const amounts = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('.amounts tbody tr')].map((tr) => [
        tr.children[0].textContent.toLowerCase(),
        tr.children[1].textContent,
      ]),
    ),
  );
const table = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.parts tbody tr')].map((tr) =>
      [...tr.children].map((c, i) => (i === 0 ? c.textContent.toLowerCase() : c.textContent)),
    ),
  );
const heading = (page, name) => page.getByRole('heading', { level: 1, name }).waitFor();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Follows the link `name` of the card's family section and checks the screen it reaches. */
const follow = async (page, name, label) => {
  const link = page.locator('.family .family-link', { hasText: name });
  const box = await link.boundingBox();
  check(box !== null && box.height >= 44, `${label}: family link "${name}" is at least 44 px high`);
  await link.click();
  await heading(page, name);
};

export const family = async (browser, origin) => {
  const label = 'families 360px';
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await page.goto(`${origin}/?no-sw#/ratios/roux`);
  await heading(page, 'Roux');

  // roux -> roux-whole-butter -> back
  check(
    (await page.locator('.family h3').allTextContents()).join() === 'Variations' &&
      (await page.locator('.family .family-link').allTextContents()).join() ===
        'Roux with whole butter',
    `${label}: the root card lists its variation`,
  );
  await follow(page, 'Roux with whole butter', label);
  check(
    page.url().endsWith('#/ratios/roux-whole-butter'),
    `${label}: the link opens the variation`,
  );
  check(
    same(await table(page), [
      ['flour', '1', '100'],
      ['fat', '1', '100'],
    ]),
    `${label}: variation parts 1 : 1, 100 % each`,
  );
  check(
    (await page.locator('.family h3').allTextContents()).join() === 'Variation of' &&
      (await page.locator('.family .family-link').allTextContents()).join() === 'Roux',
    `${label}: the variation card shows "Variation of Roux"`,
  );
  await page.locator('.calc input.field').fill('500');
  check(
    same(await amounts(page), { flour: '500 g', fat: '500 g' }),
    `${label}: 500 g flour gives 500 g fat`,
  );
  check(
    (await page.locator('.source').innerText()) === 'Source: Michael Ruhlman, Ratio, p. 17' &&
      !(await page.locator('.parts').evaluate((n) => n.parentElement.innerText)).includes('docs/'),
    `${label}: the variation shows its source as author, title and page, no repository path`,
  );
  await page.goBack();
  await heading(page, 'Roux');
  check(page.url().endsWith('#/ratios/roux'), `${label}: back returns to roux`);

  // bread-dough-ratio -> bread-dough-bakers-percent
  await page.goto(`${origin}/?no-sw#/ratios/bread-dough-ratio`);
  await heading(page, 'Bread dough, ratio');
  await follow(page, "Bread dough, baker's percentages", label);
  check(
    same(await table(page), [
      ['flour', '100', '100'],
      ['water', '60', '60'],
      ['yeast', '3', '3'],
      ['salt', '2usual 1.8–2', '2'],
    ]),
    `${label}: bread variation parts, the salt range line beside the part`,
  );
  check(
    (await page.locator('.parts .range').innerText()) === 'usual 1.8–2',
    `${label}: salt shows "usual 1.8-2"`,
  );
  const o = await overflow(page);
  check(
    o.scroll <= 0 && o.wide.length === 0,
    `${label}: no horizontal scroll ${JSON.stringify(o)}`,
  );
  const small = await smallTargets(page);
  check(small.length === 0, `${label}: targets at least 44 x 44 ${small.join('; ')}`);
  check(!FORBIDDEN.test(await page.locator('main').innerText()), `${label}: no alarming wording`);
  await page.goBack();
  await heading(page, 'Bread dough, ratio');
  check(page.url().endsWith('#/ratios/bread-dough-ratio'), `${label}: back returns to the root`);

  // The list shows each family under its root
  await page.goto(`${origin}/?no-sw#/ratios`);
  await heading(page, 'Ratios');
  const groups = await page.evaluate(() =>
    [...document.querySelectorAll('.family-group')]
      .filter((g) => g.querySelector('h2'))
      .map((g) => [
        g.querySelector('h2').textContent,
        [...g.querySelectorAll('.ratio-name')].map((n) => n.textContent),
        g.querySelector('li:nth-child(2) .ratio-short')?.textContent,
      ]),
  );
  check(
    same(groups, [
      [
        'Bread dough, ratio',
        ['Bread dough, ratio', "Bread dough, baker's percentages"],
        '100 : 60 : 3 : 2',
      ],
      ['Roux', ['Roux', 'Roux with whole butter'], '1 : 1'],
    ]),
    `${label}: list groups variations under the root, short ratio from the resolved parts ${JSON.stringify(groups)}`,
  );
  check(
    problems.length === 0,
    `${label}: no console errors or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
};
