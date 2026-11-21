// Stage 2 of a run: the entry screen (edit, remove with Undo) and the categories screen (add,
// rename, hide, remove), as one household would do them on the list stage's entries.
import { goTo, ok, rowOf, rows, said, showAll } from './driver.mjs';

const only = (list, name) => list.filter((r) => r.name === name);

export async function entryStage(run, { page }) {
  const { t, lang, texts } = run;
  const dairy = texts.STARTING_CATEGORIES.find((c) => c.id === 'dairy')[lang];
  await page.goto(`${run.server.origin}/#/`);
  await page.waitForSelector('.entry');
  await rowOf(page, 'Milk').locator('.entry-text').click();
  await page.waitForSelector('.entry-form');
  await ok(
    run,
    'entry screen: the header has the name and a back arrow, the body no heading',
    async () => {
      const back = page.locator('.fr-header').getByRole('link', { name: t.nav.back, exact: true });
      return (
        (await page.locator('h1').allInnerTexts()).join('|') === 'Milk' &&
        (await back.getAttribute('href')) === '#/' &&
        (await page.locator('main h1').count()) === 0
      );
    },
  );

  const form = page.locator('.entry-form');
  // A label that wraps a select also contains its options, so the field is found by its caption.
  const label = (text) =>
    form
      .locator('label.form-field', { has: page.locator('.form-label', { hasText: text }) })
      .locator('input, textarea, select');
  await ok(
    run,
    'entry screen: shows the stored name, amount and priority',
    async () =>
      (await label(t.entry.name).inputValue()) === 'Milk' &&
      (await label(t.entry.amount).inputValue()) === '2 l' &&
      (await form.locator('.chip-now input').isChecked()),
  );
  await label(t.entry.name).fill('Whole milk');
  await label(t.entry.amount).fill('3 l');
  await label(t.entry.note).fill('green cap');
  await form.locator('.chip-sometime').click();
  await label(t.entry.category).selectOption({ label: dairy });
  await form.getByRole('button', { name: t.entry.save, exact: true }).click();
  await page.waitForSelector('.screen-list');
  await showAll(page);
  await ok(
    run,
    'entry screen: after Save the list shows the changes under the category heading',
    async () => {
      const row = rowOf(page, 'Whole milk');
      const section = page.locator('.step-sometime');
      return (
        (await row.locator('.entry-amount').innerText()) === '3 l' &&
        (await row.locator('.entry-note').innerText()) === 'green cap' &&
        (await section.locator('.category-title').textContent()) === dairy &&
        (await section.locator('.entry').count()) === 1 &&
        (await page.locator('.step-now').count()) === 0
      );
    },
  );

  await rowOf(page, 'Whole milk').locator('.entry-text').click();
  await page.waitForSelector('.entry-form');
  await ok(run, 'entry screen: an empty name is refused with a message', async () => {
    await label(t.entry.name).fill('  ');
    await form.getByRole('button', { name: t.entry.save, exact: true }).click();
    return (await page.locator('.entry-form [role=alert]').innerText()) === t.entry.nameNeeded;
  });
  await label(t.entry.name).fill('Whole milk');
  await form.getByRole('button', { name: t.entry.remove, exact: true }).click();
  await said(page, t.list.removed('Whole milk'));
  await ok(
    run,
    'entry screen: Remove leaves the list without the entry',
    async () => only(await rows(page), 'Whole milk').length === 0,
  );
  await page.locator('.fr-toast').getByRole('button', { name: t.list.undo, exact: true }).click();
  await ok(run, 'entry screen: Undo brings the entry back with its changes', async () => {
    await page.waitForFunction(() => document.querySelector('.entry-note'));
    return (
      only(await rows(page), 'Whole milk').length === 1 &&
      (await rowOf(page, 'Whole milk').locator('.entry-note').innerText()) === 'green cap'
    );
  });
}

export async function categoriesStage(run, { page }) {
  const { t, lang, texts } = run;
  const name = (id) => texts.STARTING_CATEGORIES.find((c) => c.id === id)[lang];
  await page.goto(`${run.server.origin}/#/categories`);
  await page.waitForSelector('.categories .category');
  const row = (text) =>
    page.locator('.category', { has: page.locator('.category-name', { hasText: text }) });
  const button = (scope, text) => scope.getByRole('button', { name: text, exact: true });

  await page.locator('#new-category').fill('Corner shop');
  await page.locator('#new-category').press('Enter');
  await ok(run, 'categories: an own category is added', () =>
    row('Corner shop')
      .waitFor()
      .then(() => true),
  );

  await button(row(name('bakery')), t.categories.rename).click();
  await page.getByLabel(t.categories.nameOf(name('bakery')), { exact: true }).fill('Bakes');
  await page.getByLabel(t.categories.nameOf(name('bakery')), { exact: true }).press('Enter');
  await ok(run, 'categories: a starting category is renamed', () =>
    row('Bakes')
      .waitFor()
      .then(() => true),
  );

  await button(row(name('fish')), t.categories.hide).click();
  await ok(run, 'categories: a starting category is hidden (tagged, offers Show)', async () => {
    await button(row(name('fish')), t.categories.show).waitFor();
    return (await row(name('fish')).locator('.tag').innerText()) === t.categories.hidden;
  });

  await page.locator('a[href="#/"]').first().click();
  await rowOf(page, 'Whole milk').locator('.entry-text').click();
  await page.waitForSelector('.entry-form');
  await ok(
    run,
    'categories: the entry screen offers the own and renamed ones, not the hidden one',
    async () => {
      const options = await page.locator('.entry-form select option').allInnerTexts();
      return (
        options.includes('Corner shop') &&
        options.includes('Bakes') &&
        !options.includes(name('fish')) &&
        !options.includes(name('bakery'))
      );
    },
  );
  // Put the entry in the own category so that removing it has something to move.
  await page
    .locator('.entry-form label.form-field', {
      has: page.locator('.form-label', { hasText: t.entry.category }),
    })
    .locator('select')
    .selectOption({ label: 'Corner shop' });
  await page
    .locator('.entry-form')
    .getByRole('button', { name: t.entry.save, exact: true })
    .click();
  await page.waitForSelector('.screen-list');
  await ok(run, 'categories: the list shows the entry under the own category heading', async () =>
    (await page.locator('.category-title').allTextContents()).includes('Corner shop'),
  );

  await goTo(page, '#/categories', t.categories.title);
  await button(row('Corner shop'), t.categories.remove).click();
  await said(page, t.categories.removed('Corner shop'));
  await ok(
    run,
    'categories: the own category is removed, its entry stays on the list',
    async () => {
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.category-name')].some((n) =>
            n.textContent.includes('Corner shop'),
          ),
      );
      await page.locator('a[href="#/"]').first().click();
      await page.waitForSelector('.screen-list');
      return (
        only(await rows(page), 'Whole milk').length === 1 &&
        !(await page.locator('.category-title').allTextContents()).includes('Corner shop')
      );
    },
  );
}
