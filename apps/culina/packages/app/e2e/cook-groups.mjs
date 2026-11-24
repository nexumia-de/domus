// Cook's list in groups (docs/behaviour.md, Cook), in a browser on the real shipped files and an
// empty notebook, at 360 x 720, in English and German: by name the frames come first under "Put
// together", then the courses with the main course first, each under a heading of level 2 that
// names the group and its number of dishes; a filter that leaves two groups shows two headings
// with their counts, one that leaves one group none (the control); the order "Use up first" is one
// flat list; a dish opened from a group leads back to the list in its groups. Chromium at 360 px; no
// screen reader, no real phone, no own dish without a course (test/browse-groups.test.ts has it).
import { check, watch } from './harness.mjs';
import { layout, open } from './editor-helpers.mjs';

const headings = (page) => page.locator('.dish-group-heading').allInnerTexts();
const hashOf = (page) => new URL(page.url()).hash;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const tidy = (texts) => texts.map((t) => t.replace(/\s+/g, ' ').trim());
const openFilter = async (page) => {
  const fold = page.locator('details.dish-filter-fold');
  if (!(await fold.evaluate((d) => d.open))) await fold.locator('summary').click();
};

const TEXT = {
  en: {
    locale: 'en-US',
    frames: 'Put together · 13 dishes',
    mainFrames: 'Put together · 12 dishes',
    main: 'Main course · 38 dishes',
    course: 'Course',
    mainOption: 'Main course',
    soupOption: 'Soup',
    soupFrames: 'Put together · 1 dish',
    soup: 'Soup · 13 dishes',
    dessertOption: 'Dessert',
    anyCourse: 'Any course',
    order: 'Order',
    useUp: 'Use up first',
    byName: 'By name',
    count: (n) => `${n} dishes`,
    back: 'Back to the list',
  },
  de: {
    locale: 'de-DE',
    frames: 'Zusammengestellt · 13 Gerichte',
    mainFrames: 'Zusammengestellt · 12 Gerichte',
    main: 'Hauptgericht · 38 Gerichte',
    course: 'Gang',
    mainOption: 'Hauptgericht',
    soupOption: 'Suppe',
    soupFrames: 'Zusammengestellt · 1 Gericht',
    soup: 'Suppe · 13 Gerichte',
    dessertOption: 'Nachspeise',
    anyCourse: 'Jeder Gang',
    order: 'Reihenfolge',
    useUp: 'Zuerst verbrauchen',
    byName: 'Nach Name',
    count: (n) => `${n} Gerichte`,
    back: 'Zurück zur Liste',
  },
};

const oneLanguage = async (browser, server, lang) => {
  const t = TEXT[lang];
  const label = `360px cook groups (${lang})`;
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    locale: t.locale,
  });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  await open(page, server.origin, 'cook');
  await page.locator('.dish-group').first().waitFor();

  // By name: the groups, in order, each a heading of level 2 with its count.
  const shown = tidy(await headings(page));
  check(
    shown[0] === t.frames && shown[1] === t.main,
    `${label}: the frames first, then the main courses (${shown.slice(0, 3).join(' | ')})`,
  );
  const level2 = await page.getByRole('heading', { level: 2, name: t.frames }).count();
  check(level2 === 1, `${label}: a group heading is a heading of level 2 with its count`);
  const counts = await page
    .locator('.dish-group')
    .evaluateAll((groups) =>
      groups.map((g) => [
        g.querySelectorAll('.dish-row').length,
        Number(/(\d+)/.exec(g.querySelector('.dish-group-heading').textContent)?.[1]),
        g.querySelector('ul').getAttribute('aria-labelledby') ===
          g.querySelector('.dish-group-heading').id,
      ]),
    );
  check(
    counts.every(([rows, said, labelled]) => rows === said && rows > 0 && labelled) &&
      counts.reduce((n, [rows]) => n + rows, 0) === 121 &&
      (await page.locator('.dish-row').count()) === 121,
    `${label}: every group says how many it holds, none is empty, 121 rows in all (${JSON.stringify(counts)})`,
  );
  const firstGroup = await page
    .locator('.dish-group')
    .first()
    .locator('.entry-name')
    .allInnerTexts();
  check(
    firstGroup.includes('Tacos') && firstGroup.length === 13,
    `${label}: the tacos are among the frames (${firstGroup.join(', ')})`,
  );
  await layout(page, label);

  // A filter that leaves two groups: two headings with the right counts.
  await openFilter(page);
  await page.getByLabel(t.course, { exact: true }).selectOption({ label: t.mainOption });
  const two = tidy(await headings(page));
  check(
    two.length === 2 &&
      two[0] === t.mainFrames &&
      two[1] === t.main &&
      (await page.locator('.dish-count').innerText()) === t.count(50),
    `${label}: main course leaves the frames and the main courses (${two.join(' | ')})`,
  );
  // Soup leaves two groups too: the soup frame stays among the frames, not in its course.
  await page.getByLabel(t.course, { exact: true }).selectOption({ label: t.soupOption });
  const soups = tidy(await headings(page));
  check(
    same(soups, [t.soupFrames, t.soup]),
    `${label}: soup leaves the soup frame and the soups (${soups.join(' | ')})`,
  );
  // The control: one group left is one list without a heading.
  await page.getByLabel(t.course, { exact: true }).selectOption({ label: t.dessertOption });
  check(
    (await page.locator('.dish-group-heading').count()) === 0 &&
      (await page.locator('.dish-rows-list .dish-row').count()) === 9,
    `${label}: dessert leaves one group, shown as one list without a heading`,
  );
  await page.getByLabel(t.course, { exact: true }).selectOption({ label: t.anyCourse });

  // "Use up first" is one list in its own order; by name the groups come back.
  await page.getByLabel(t.order, { exact: true }).selectOption({ label: t.useUp });
  check(
    (await page.locator('.dish-group-heading').count()) === 0 &&
      (await page.locator('.dish-row').count()) === 121,
    `${label}: Use up first is one flat list of every dish`,
  );
  await page.getByLabel(t.order, { exact: true }).selectOption({ label: t.byName });
  check(
    (await page.locator('.dish-group-heading').count()) > 2,
    `${label}: by name the groups are back`,
  );

  // The way back from a dish of a later group: Cook again, in groups, with the filter untouched.
  // The place in the list on the way back is e2e/list-place.mjs's.
  await openFilter(page);
  await page.getByLabel(t.course, { exact: true }).selectOption({ label: t.mainOption });
  const row = page.locator('.dish-group').nth(1).locator('.dish-row').first();
  const name = await row.locator('.entry-name').innerText();
  await row.click();
  await page.getByRole('heading', { level: 1, name }).waitFor();
  await page.getByRole('link', { name: t.back }).click();
  await page.locator('.dish-group').first().waitFor();
  check(
    hashOf(page) === '#/cook' &&
      same(tidy(await headings(page)), [t.mainFrames, t.main]) &&
      (await page.getByLabel(t.course, { exact: true }).inputValue()) === 'main',
    `${label}: back from ${name}, Cook in the same two groups under the same filter`,
  );
  await page.getByLabel(t.course, { exact: true }).selectOption({ label: t.anyCourse });
  check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
  await context.close();
};

export const cookGroups = async (browser, server) => {
  await oneLanguage(browser, server, 'en');
  await oneLanguage(browser, server, 'de');
};
