// The one list of every dish in a browser, at 360 x 720: the two example dishes of the notebook
// ("Add example data") and the two FICTIONAL shipped dishes of e2e/classics-fixture.mjs in one list
// on Cook (docs/decisions/cook-screen.md), by name in groups of their course; each choice of the filter narrows, choices combine,
// nothing found offers "Show all"; the choice survives a reload; the Notebook's Dishes are own and
// shipped dishes in a plain list, without the filter; a shipped row opens its dish; the old addresses of the classics and of Start land on
// Cook with their filter. "Only with what I have" and "Use up first" are in e2e/cook.mjs. No horizontal
// scroll, 44 px targets, nothing focused on open, no console error. Not proved here: the real 48
// shipped dishes, desktop width, German (the texts are the same keys), a real phone.
import { check, watch } from './harness.mjs';
import { openWith, PAN, SECOND } from './classics-fixture.mjs';
import { overflow, smallTargets } from './measure.mjs';
import { seed } from './seed.mjs';

const label = '360px dish browse';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const OWN = ['Example: Flat dough with pan sauce', 'Example: Vegetable plate with herb oil'];
const byName = (list) => list.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
// By name Cook stands in groups (docs/behaviour.md, Cook): the main courses (the pan dish and the
// two example dishes, own and shipped mixed) by name, then the soup (the second dish).
const ALL = [...byName([PAN.name.en, ...OWN]), SECOND.name.en];

const names = (page) => page.locator('.dish-rows .entry-name').allInnerTexts();
const count = (page) => page.locator('.dish-count').innerText();
/** Opens the folded filter (a `<details>`) when it is closed. */
const openFilter = async (page) => {
  const fold = page.locator('details.dish-filter-fold');
  if ((await fold.count()) > 0 && !(await fold.evaluate((d) => d.open)))
    await fold.locator('summary').click();
};
const choose = async (page, name, option) => {
  await openFilter(page);
  await page.getByLabel(name, { exact: true }).selectOption(option);
};
/** The options of the filter's selects whose text does not fit the select (its arrow takes ~20 px). */
const clippedOptions = (page) =>
  page.locator('.dish-filter select').evaluateAll((selects) =>
    selects.flatMap((s) => {
      const css = getComputedStyle(s);
      const pen = document.createElement('canvas').getContext('2d');
      pen.font = css.font;
      const room = s.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) - 20;
      return [...s.options]
        .map((o) => [o.text, Math.round(pen.measureText(o.text).width)])
        .filter(([, w]) => w > room)
        .map(([text, w]) => `${text} (${w} > ${Math.round(room)})`);
    }),
  );
const hashOf = (page) => new URL(page.url()).hash;
const layout = async (page, where) => {
  const o = await overflow(page);
  check(o.scroll <= 0 && o.wide.length === 0, `${label} ${where}: no horizontal scroll ${o.wide}`);
  const small = await smallTargets(page);
  check(small.length === 0, `${label} ${where}: targets at least 44 x 44 ${small.join('; ')}`);
};

export const dishBrowse = async (browser, server) => {
  const { origin } = server;
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await seed(page, origin);

  // Cook: both origins in one list, by name.
  await openWith(page, origin, 'cook');
  await page.locator('.dish-row').first().waitFor();
  check(
    await page.evaluate(() => document.activeElement === document.body),
    `${label}: nothing is focused on open`,
  );
  check(
    same(await names(page), ALL) &&
      same(await page.locator('.dish-group-heading').allInnerTexts(), [
        'Main course · 3 dishes',
        'Soup · 1 dish',
      ]),
    `${label}: every dish in one list, by name within its course (${await names(page)})`,
  );
  check(
    (await page.locator('.dish-row-own').count()) === 2 &&
      (await page.locator('.dish-row-shipped').count()) === 2,
    `${label}: two own and two shipped rows`,
  );
  check((await count(page)) === '4 dishes', `${label}: the count line (${await count(page)})`);
  const panMeta = await page
    .locator('.dish-row', { hasText: PAN.name.en })
    .locator('.entry-meta')
    .innerText();
  // The course is the heading of the row's group; the row says cuisine and origin.
  check(
    panMeta === 'German · Shipped',
    `${label}: a shipped row says cuisine and origin under its course's heading (${panMeta})`,
  );
  check(
    (await page.getByLabel('What it is like').count()) === 1 &&
      (await page.locator('.entry-filter').count()) === 0,
    `${label}: the shared controls replace the old single select`,
  );
  check(
    (await page.locator('.section-tabs').count()) === 0 &&
      (await page.getByRole('link', { name: 'What is there', exact: true }).count()) === 1,
    `${label}: Cook is one screen, with the way to the stock`,
  );
  await layout(page, 'Cook');

  // Each choice narrows.
  await choose(page, 'From', { label: 'Mine' });
  check(same(await names(page), OWN), `${label}: My dishes (${await names(page)})`);
  // An own dish may state a course (the example dishes do), so the meta line can be there; it
  // must not say the origin again.
  const ownMeta = await page.locator('.dish-row-own .entry-meta').allInnerTexts();
  check(
    ownMeta.every((m) => !m.includes('My dish')),
    `${label}: with one origin chosen, no row repeats it (${ownMeta.join(' | ')})`,
  );
  await choose(page, 'From', { label: 'All dishes' });
  await choose(page, 'Cuisine', { label: 'Italian' });
  check(same(await names(page), [SECOND.name.en]), `${label}: Italy (${await names(page)})`);
  await choose(page, 'Cuisine', { label: 'Any cuisine' });
  await choose(page, 'Course', { label: 'Soup' });
  check(same(await names(page), [SECOND.name.en]), `${label}: Soup (${await names(page)})`);
  await choose(page, 'Course', { label: 'Any course' });
  await openFilter(page);
  await page.getByLabel('Without meat and fish').check();
  check(
    !(await names(page)).includes(SECOND.name.en) && (await names(page)).includes(PAN.name.en),
    `${label}: Without meat and fish drops the dish with meat (${await names(page)})`,
  );
  check(
    await page.getByLabel('Without meat and fish').evaluate((n) => n === document.activeElement),
    `${label}: the tick keeps focus after the controls are drawn again`,
  );
  await page.getByLabel('Without meat and fish').uncheck();

  // Choices combine; nothing found offers Show all.
  await choose(page, 'From', { label: 'Shipped' });
  await choose(page, 'Course', { label: 'Main course' });
  check(
    same(await names(page), [PAN.name.en]),
    `${label}: shipped and main (${await names(page)})`,
  );
  // The example dishes state a main course and no cuisine, so a cuisine leaves none of them.
  await choose(page, 'From', { label: 'Mine' });
  await choose(page, 'Cuisine', { label: 'Italian' });
  check(
    (await page.locator('.dish-rows .empty').innerText()) === 'No dish fits these choices.',
    `${label}: nothing found says so`,
  );
  await layout(page, 'nothing found');
  await page.getByRole('button', { name: 'Show all' }).click();
  check(same(await names(page), ALL), `${label}: Show all empties the filter`);
  check(
    await page.evaluate(() => document.activeElement?.classList.contains('dish-search') === true),
    `${label}: after Show all the focus is on the search field, not lost to the page`,
  );
  check(
    (await page.getByLabel('From', { exact: true }).inputValue()) === '',
    `${label}: Show all resets the controls`,
  );

  // The choice survives a reload, and the old address of Start shows the same.
  await choose(page, 'Cuisine', { label: 'German' });
  await page.reload();
  await page.locator('.dish-row').first().waitFor();
  check(
    (await page.getByLabel('Cuisine', { exact: true }).inputValue()) === 'de' &&
      same(await names(page), [PAN.name.en]),
    `${label}: the choice survives a reload (${await names(page)})`,
  );
  await openWith(page, origin, 'start');
  await page.getByRole('heading', { level: 1, name: 'Cook', exact: true }).waitFor();
  await page.locator('.dish-row').first().waitFor();
  check(
    hashOf(page) === '#/cook' &&
      (await page.getByLabel('Cuisine', { exact: true }).inputValue()) === 'de' &&
      same(await names(page), [PAN.name.en]),
    `${label}: #/start is Cook with the same choice and list (${hashOf(page)}: ${await names(page)})`,
  );
  await choose(page, 'Cuisine', { label: 'Any cuisine' });
  // The first screen of Cook as it opens, the filter folded behind its summary line (the fold's
  // purpose, docs/design.md): the switch, the order, the filter and the first result above the bar.
  // Unfolded, the filter's own controls take that room (this check measured Start unfolded until
  // Cook added the switch and the order: docs/decisions/cook-screen.md).
  const fold = page.locator('details.dish-filter-fold');
  if (await fold.evaluate((d) => d.open)) await fold.locator('summary').click();
  check(
    !(await fold.evaluate((d) => d.open)),
    `${label}: the filter is folded before the first screen is measured`,
  );
  const first = await page.locator('.dish-row').first().boundingBox();
  const bar = await page.locator('.app-nav').boundingBox();
  check(
    first !== null && bar !== null && first.y + first.height <= bar.y,
    `${label}: Cook shows the first result on its first screen (${first?.y} + ${first?.height} / ${bar?.y})`,
  );
  // The Notebook's Dishes: the own dishes for editing and building on, one plain list; no shipped
  // dish (they are on Cook, docs/decisions/sauces-are-parts.md), no dish filter, nothing of Cook.
  await openWith(page, origin, 'dishes');
  await page.getByRole('heading', { level: 1, name: 'Dishes', exact: true }).waitFor();
  check(
    same(await page.locator('.notebook-row-own .entry-name').allInnerTexts(), OWN) &&
      (await page.locator('.notebook-row-shipped').count()) === 0 &&
      (await page.getByLabel('From').count()) === 0 &&
      (await page.locator('.dish-row, .dish-filter-fold, .cook-order-row').count()) === 0 &&
      (await page.getByRole('link', { name: 'Add a dish' }).count()) === 1 &&
      (await page.getByRole('link', { name: 'Put a dish together at random' }).count()) === 1,
    `${label}: the Notebook's Dishes list the own dishes only, with "Add a dish" and the random pick, without a choice of origin or the dish filter`,
  );
  // A shipped dish is reached from Cook and kept from there.
  await openWith(page, origin, `classic/${PAN.id}`);
  await page.getByRole('heading', { level: 1, name: PAN.name.en }).waitFor();
  check(
    (await page.getByRole('button', { name: 'Keep in my notebook' }).count()) === 1,
    `${label}: the shipped dish's screen offers Keep in my notebook`,
  );
  await openWith(page, origin, 'cook');
  check(same(await names(page), ALL), `${label}: back on Cook, every dish again`);

  // A shipped row opens the classic.
  await page.locator('.dish-row', { hasText: SECOND.name.en }).click();
  await page.getByRole('heading', { level: 1, name: SECOND.name.en }).waitFor();
  check(hashOf(page) === `#/classic/${SECOND.id}`, `${label}: a shipped row opens its dish`);

  // The old addresses of the classics: the list with their filter, no new history entry.
  await page.evaluate(() => (location.hash = '#/classics/de'));
  await page.waitForFunction(() => location.hash === '#/cook');
  await page.locator('.dish-row').first().waitFor();
  check(
    same(await names(page), [PAN.name.en]) &&
      (await page.getByLabel('From', { exact: true }).inputValue()) === 'shipped',
    `${label}: #/classics/de is the shipped dishes of Germany (${await names(page)})`,
  );
  await page.goBack();
  await page.waitForFunction((id) => location.hash === `#/classic/${id}`, SECOND.id);
  check(true, `${label}: the old address left no history entry of its own`);
  await openWith(page, origin, 'classics');
  await page.waitForFunction(() => location.hash === '#/cook');
  check(
    same(await names(page), [PAN.name.en, SECOND.name.en].sort()),
    `${label}: #/classics is every shipped dish (${await names(page)})`,
  );
  check(problems.length === 0, `${label}: no console error ${problems.join('; ')}`);
  await context.close();
  await backToList(browser, origin);
  await fits(browser, origin);
  await loading(browser, origin);
};

/** The way back from a dish returns to the list it was opened from and leaves the filter alone. */
export const backToList = async (browser, origin) => {
  const where = `${label} back`;
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await seed(page, origin);
  await openWith(page, origin, 'cook');
  await choose(page, 'Course', { label: 'Main course' });
  await page.getByLabel('Without meat and fish').check();
  const before = await page.evaluate(() => localStorage.getItem('culina.dishes'));
  const shownBefore = await names(page);
  await page.locator('.dish-row', { hasText: PAN.name.en }).click();
  await page.getByRole('heading', { level: 1, name: PAN.name.en }).waitFor();
  const back = page.locator('.dish-card a.back-to-list, .dish-card a.family-link').first();
  check(
    (await back.innerText()) === 'Back to the list',
    `${where}: a shipped dish names its way back as one to the list (${await back.innerText()})`,
  );
  await back.click();
  await page
    .getByRole('heading', { level: 1, name: 'Cook', exact: true })
    .waitFor({ timeout: 5000 })
    .catch(() => undefined);
  check(
    hashOf(page) === '#/cook',
    `${where}: back from a shipped dish is Cook again (${hashOf(page)})`,
  );
  check(
    (await page.evaluate(() => localStorage.getItem('culina.dishes'))) === before &&
      same(await names(page), shownBefore),
    `${where}: the filter is untouched (${await page.evaluate(() => localStorage.getItem('culina.dishes'))})`,
  );
  // An own dish opened from Cook goes back to Cook too. (The example dishes are not known to be
  // without meat, so that choice is dropped first.)
  await openFilter(page);
  await page.getByLabel('Without meat and fish').uncheck();
  await page.locator('.dish-row-own').first().click();
  await page.locator('.dish-card h1').waitFor();
  await page
    .locator('.dish-card a.back-to-list:visible, .dish-card a.back-link:visible')
    .first()
    .click();
  await page.waitForFunction(() => location.hash !== '' && !location.hash.startsWith('#/dishes/'));
  check(
    hashOf(page) === '#/cook',
    `${where}: back from an own dish is Cook again (${hashOf(page)})`,
  );
  // Opened from its own address (no list before it): the way back is the one list, Cook.
  await openWith(page, origin, `classic/${PAN.id}`);
  const href = await page
    .locator('.dish-card a.back-to-list, .dish-card a.family-link')
    .first()
    .getAttribute('href');
  check(
    href === '#/cook',
    `${where}: without a list before it, the way back of a shipped dish is Cook (${href})`,
  );
  const toClassics = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="#/classics"]')].map((a) => a.textContent),
  );
  check(
    toClassics.length === 0,
    `${where}: no link inside the app leads to an old address (${toClassics})`,
  );
  check(problems.length === 0, `${where}: no console error ${problems.join('; ')}`);
  await context.close();
};

/** At 360 px every option of every select of the filter fits, in English and in German. */
export const fits = async (browser, origin) => {
  for (const lang of ['en', 'de']) {
    const where = `${label} ${lang} fits`;
    const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
    const page = await context.newPage();
    // The example data is added in English; the language is then set as the setting does.
    await seed(page, origin);
    await page.evaluate((l) => localStorage.setItem('culina.lang', l), lang);
    await openWith(page, origin, 'cook');
    await page.locator('.dish-row').first().waitFor();
    await openFilter(page);
    const selects = await page.locator('.dish-filter select').count();
    const clipped = await clippedOptions(page);
    check(
      selects === 4 && clipped.length === 0,
      `${where}: no select of the filter cuts off an option (${selects} selects; ${clipped.join('; ')})`,
    );
    await context.close();
  }
};

/** While the catalogue loads, the list does not say that nothing fits and offers no Show all. */
export const loading = async (browser, origin) => {
  const where = `${label} loading`;
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const page = await context.newPage();
  await page.goto(`${origin}/?no-sw#/settings`);
  await page.evaluate(() => localStorage.setItem('culina.dishes', '{"character":"tomatoey"}'));
  let release;
  const held = new Promise((r) => (release = r));
  await page.route('**/catalogue.json', async (route) => {
    await held;
    await route.continue();
  });
  await openWith(page, origin, 'cook');
  await page.waitForTimeout(300);
  check(
    (await page.locator('.dish-show-all').count()) === 0 &&
      (await page.getByText('No dish fits these choices.').count()) === 0,
    `${where}: no "nothing fits" and no Show all before the catalogue is there`,
  );
  check(
    (await page.locator('.dish-loading').count()) === 1,
    `${where}: a quiet line says the dishes are being read`,
  );
  release();
  await page.locator('.dish-loading').waitFor({ state: 'detached' });
  check(true, `${where}: the loading line goes once the catalogue is there`);
  await context.close();
};
