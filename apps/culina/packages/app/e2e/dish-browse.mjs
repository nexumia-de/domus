// The one list of every dish in a browser, at 360 x 720: the two example dishes of the notebook
// ("Add example data") and the two FICTIONAL shipped dishes of e2e/classics-fixture.mjs in one list
// on Dishes and on Start; each choice of the filter narrows, choices combine, nothing found offers
// "Show all"; the choice survives a reload and is the same on both screens; a shipped row opens its
// dish; the old addresses of the classics land on the list with their filter. No horizontal
// scroll, 44 px targets, nothing focused on open, no console error. Not proved here: the real 48
// shipped dishes, desktop width, German (the texts are the same keys), a real phone.
import { check, watch } from './harness.mjs';
import { openWith, PAN, SECOND } from './classics-fixture.mjs';
import { overflow, smallTargets } from './measure.mjs';
import { seed } from './seed.mjs';

const label = '360px dish browse';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const OWN = ['Example: Flat dough with pan sauce', 'Example: Vegetable plate with herb oil'];
const ALL = [PAN.name.en, SECOND.name.en, ...OWN].sort((a, b) =>
  a.localeCompare(b, 'en', { sensitivity: 'base' }),
);

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

  // Dishes: both origins in one list, by name.
  await openWith(page, origin, 'dishes');
  await page.locator('.dish-row').first().waitFor();
  check(
    await page.evaluate(() => document.activeElement === document.body),
    `${label}: nothing is focused on open`,
  );
  check(same(await names(page), ALL), `${label}: every dish in one list (${await names(page)})`);
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
  check(
    panMeta === 'Main course · German · Shipped',
    `${label}: a shipped row says course, cuisine and origin (${panMeta})`,
  );
  check(
    (await page.getByLabel('What it is like').count()) === 1 &&
      (await page.locator('.entry-filter').count()) === 0,
    `${label}: the shared controls replace the old single select`,
  );
  check(
    (await page.getByRole('link', { name: 'Add a dish' }).count()) === 1 &&
      (await page.getByRole('link', { name: 'Put a dish together at random' }).count()) === 1,
    `${label}: "Add a dish" and the random pick stay`,
  );
  await layout(page, 'Dishes');

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

  // The choice survives a reload and is the same on Start.
  await choose(page, 'Cuisine', { label: 'German' });
  await page.reload();
  await page.locator('.dish-row').first().waitFor();
  check(
    (await page.getByLabel('Cuisine', { exact: true }).inputValue()) === 'de' &&
      same(await names(page), [PAN.name.en]),
    `${label}: the choice survives a reload (${await names(page)})`,
  );
  await openWith(page, origin, 'start');
  await page.getByRole('heading', { level: 1, name: 'What do you feel like?' }).waitFor();
  check(
    (await page.getByLabel('Cuisine', { exact: true }).inputValue()) === 'de' &&
      same(await names(page), [PAN.name.en]),
    `${label}: Start shows the same choice and list (${await names(page)})`,
  );
  await choose(page, 'Cuisine', { label: 'Any cuisine' });
  // The first screen of Start: the question, the filter and the first results above the bar.
  const first = await page.locator('.dish-row').first().boundingBox();
  const bar = await page.locator('.app-nav').boundingBox();
  check(
    first !== null && bar !== null && first.y + first.height <= bar.y,
    `${label}: Start shows the first result on its first screen (${first?.y} + ${first?.height} / ${bar?.y})`,
  );
  check(
    (await page.locator('.start-tools a').count()) === 5,
    `${label}: the ways into the tools follow the list`,
  );
  await layout(page, 'Start');
  await openWith(page, origin, 'dishes');
  check(same(await names(page), ALL), `${label}: a change on Start is the choice on Dishes`);
  const firstOnDishes = await page.locator('.dish-row').first().boundingBox();
  check(
    firstOnDishes !== null && firstOnDishes.y + firstOnDishes.height <= bar.y,
    `${label}: Dishes shows the first result on its first screen (${firstOnDishes?.y} + ${firstOnDishes?.height} / ${bar?.y})`,
  );

  // A shipped row opens the classic.
  await page.locator('.dish-row', { hasText: SECOND.name.en }).click();
  await page.getByRole('heading', { level: 1, name: SECOND.name.en }).waitFor();
  check(hashOf(page) === `#/classic/${SECOND.id}`, `${label}: a shipped row opens its dish`);

  // The old addresses of the classics: the list with their filter, no new history entry.
  await page.evaluate(() => (location.hash = '#/classics/de'));
  await page.waitForFunction(() => location.hash === '#/dishes');
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
  await page.waitForFunction(() => location.hash === '#/dishes');
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
  await openWith(page, origin, 'start');
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
    .getByRole('heading', { level: 1, name: 'What do you feel like?' })
    .waitFor({ timeout: 5000 })
    .catch(() => undefined);
  check(
    hashOf(page) === '#/start',
    `${where}: back from a shipped dish is Start again (${hashOf(page)})`,
  );
  check(
    (await page.evaluate(() => localStorage.getItem('culina.dishes'))) === before &&
      same(await names(page), shownBefore),
    `${where}: the filter is untouched (${await page.evaluate(() => localStorage.getItem('culina.dishes'))})`,
  );
  // An own dish opened from Start goes back to Start too. (The example dishes are not known to be
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
    hashOf(page) === '#/start',
    `${where}: back from an own dish is Start again (${hashOf(page)})`,
  );
  // Opened from its own address (no list before it): the way back is the one list.
  await openWith(page, origin, `classic/${PAN.id}`);
  const href = await page
    .locator('.dish-card a.back-to-list, .dish-card a.family-link')
    .first()
    .getAttribute('href');
  check(
    href === '#/dishes',
    `${where}: without a list before it, the way back is the list of dishes (${href})`,
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
    await openWith(page, origin, 'start');
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
  await openWith(page, origin, 'start');
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
