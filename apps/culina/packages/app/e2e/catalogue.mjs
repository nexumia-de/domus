// The ingredient catalogue in the picker: an empty notebook, search, pick, amounts by volume and
// by piece against the engine, reload, offline under the service worker, a failed load, 360 px;
// German names are in catalogue-german.mjs.
import { check, watch } from './harness.mjs';
import {
  addLine,
  file,
  idsWithChains,
  rowNamed,
  searchBox,
  setAmount,
} from './catalogue-helpers.mjs';
import { catalogueGerman } from './catalogue-german.mjs';
import { catalogueTree } from './catalogue-tree.mjs';
import { engine } from './notebook-fixture.mjs';
import { shown } from './ratio-fixture.mjs';
import { formReady, layout, listStore, open } from './editor-helpers.mjs';
import { controlled } from './smoke.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const GARLIC = rowNamed('Garlic'); // density and unit weight
const FLOUR = rowNamed('Wheat flour, white, all-purpose, enriched, bleached'); // density
const EGG = rowNamed('Egg, whole, fresh'); // unit weight
const FACTS = Object.fromEntries(
  [GARLIC, FLOUR, EGG].map((r) => [
    r.id,
    {
      ...(r.densityGPerMl ? { densityGPerMl: r.densityGPerMl.value } : {}),
      ...(r.unitWeightG ? { unitWeightG: r.unitWeightG.value } : {}),
    },
  ]),
);

const catalogueRows = (page) => page.locator('.picker-catalogue .picker-choice');
const ownRows = (page) => page.locator('.picker > .picker-rows .picker-choice');
const entryButton = (page, name) =>
  page.locator('.picker-catalogue').getByRole('button', { name: new RegExp(`^${name} by `) });

const pickAndCompute = async (page, origin) => {
  const label = '360px catalogue picker';
  await open(page, origin, 'components/new');
  await formReady(page);
  check(
    (await listStore(page, 'ingredients')).length === 0,
    `${label}: the notebook starts with no ingredients`,
  );
  await addLine(page);
  check(
    (await page.locator('.picker-catalogue .picker-heading').innerText()) === 'From the catalogue',
    `${label}: the picker has its own section "From the catalogue"`,
  );
  await page
    .getByText(`Type a name to search ${file.ingredients.length} ingredients of the catalogue.`)
    .waitFor();
  check(true, `${label}: with no search text the section says how many it holds`);
  const served = await page.evaluate(async () => (await fetch('catalogue.json')).json());
  check(
    same(served, file),
    `${label}: catalogue.json served by the app is the generated file (${file.ingredients.length} rows)`,
  );

  await searchBox(page).fill('garlic');
  await entryButton(page, 'Garlic').waitFor();
  check(
    (await catalogueRows(page).first().innerText()).replace(/\s+/g, ' ') ===
      'Garlic by volume and by piece',
    `${label}: a catalogue row shows its name and what it converts`,
  );
  check(
    (await page.locator('.picker > .picker-rows').innerText()).includes('Nothing in your notebook'),
    `${label}: the notebook's own list stays above and says it has nothing by that name`,
  );
  await layout(page, `${label} (search results)`);
  await entryButton(page, 'Garlic').click();
  await page.locator('.picker').waitFor({ state: 'detached' });
  const [stored] = await listStore(page, 'ingredients');
  check(
    (await listStore(page, 'ingredients')).length === 1 && same(stored, GARLIC),
    `${label}: choosing an entry stores the catalogue row unchanged as an ingredient`,
  );
  await setAmount(page, 0, '1', 'tbsp');

  // The second garlic line finds the record that is in the notebook now; nothing is written twice.
  await addLine(page);
  await searchBox(page).fill('garlic');
  await ownRows(page).first().waitFor();
  check(
    (await entryButton(page, 'Garlic').count()) === 0 &&
      (await ownRows(page).first().innerText()).trim() === 'Garlic',
    `${label}: an entry already in the notebook is listed once, in the notebook's own section`,
  );
  await ownRows(page).first().click();
  await setAmount(page, 1, '3', 'count');
  check(
    (await listStore(page, 'ingredients')).length === 1,
    `${label}: choosing it again does not write a second record`,
  );

  await addLine(page);
  await searchBox(page).fill('all-purpose, enriched, bleached');
  await entryButton(page, FLOUR.name).click();
  await setAmount(page, 2, '2', 'cup');
  await addLine(page);
  await searchBox(page).fill('egg, whole, fresh');
  await entryButton(page, 'Egg, whole, fresh').first().click();
  await setAmount(page, 3, '3', 'count');

  await page.getByLabel('Name', { exact: true }).fill('From the catalogue');
  await layout(page, `${label} (editor with catalogue ingredients)`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'From the catalogue' }).waitFor();
  const [component] = await listStore(page, 'components');
  const lines = [
    [GARLIC, 1, 'tbsp'],
    [GARLIC, 3, 'count'],
    [FLOUR, 2, 'cup'],
    [EGG, 3, 'count'],
  ];
  const expected = engine.componentLineGrams(
    {
      id: component.id,
      lines: lines.map(([r, value, unit]) => ({
        ref: { kind: 'ingredient', id: r.id },
        amount: { value, unit },
      })),
    },
    FACTS,
  );
  if (!expected.ok) throw new Error(`engine: ${expected.error.code}`);
  const table = await page.evaluate(() =>
    [...document.querySelectorAll('.lines-table tbody tr')].map((tr) => [
      tr.children[0].textContent.replace(/\s+/g, ' ').trim(),
      tr.children[1].textContent.trim(),
    ]),
  );
  check(
    same(
      table.map((r) => r[1]),
      expected.lines.map((l) => shown(l.g)),
    ),
    `${label}: the grams shown are the engine's from the catalogue rows ${JSON.stringify(table.map((r) => r[1]))}`,
  );
  const ids = (await listStore(page, 'ingredients')).map((r) => r.id).sort();
  check(
    same(ids, idsWithChains(GARLIC, FLOUR, EGG)),
    `${label}: the three chosen ingredients are in the notebook with their parent chains (${ids.length} records)`,
  );
  return component.id;
};

const reload = async (page, origin, id) => {
  const label = 'catalogue reload';
  await page.goto('about:blank');
  await page.goto(`${origin}/?no-sw&e2e-store#/components/${id}`);
  await page.getByRole('heading', { level: 1, name: 'From the catalogue' }).waitFor();
  const stored = await listStore(page, 'ingredients');
  check(
    stored.length === idsWithChains(GARLIC, FLOUR, EGG).length &&
      same(
        stored.find((r) => r.id === GARLIC.id),
        GARLIC,
      ),
    `${label}: the ingredients chosen from the catalogue are still there after a reload`,
  );
  await page.goto(`${origin}/?no-sw&e2e-store#/components/new`);
  await formReady(page);
  await addLine(page);
  await searchBox(page).fill('garlic');
  await ownRows(page).first().waitFor();
  check(
    (await entryButton(page, 'Garlic').count()) === 0,
    `${label}: the catalogue no longer offers what the notebook has`,
  );
};

const offline = async (browser, origin) => {
  const label = 'catalogue offline';
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await page.goto(`${origin}/?e2e-store#/components/new`);
  await formReady(page);
  await controlled(page);
  const cached = await page.evaluate(
    async () => (await caches.match('catalogue.json')) !== undefined,
  );
  check(cached, `${label}: the service worker has catalogue.json in its cache`);
  await context.setOffline(true);
  await page.reload();
  await formReady(page);
  await addLine(page);
  await searchBox(page).fill('egg, whole, fresh');
  await entryButton(page, 'Egg, whole, fresh').first().click();
  await page.locator('.picker').waitFor({ state: 'detached' });
  check(
    same((await listStore(page, 'ingredients')).map((r) => r.id).sort(), idsWithChains(EGG)),
    `${label}: offline, search and choosing an entry work, with its parents`,
  );
  check(
    problems.length === 0,
    `${label}: no console errors, CSP violations or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
};

const unavailable = async (browser, origin) => {
  const label = 'catalogue unavailable';
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  await context.route('**/catalogue.json', (route) => route.abort());
  const page = await context.newPage();
  await open(page, origin, 'components/new');
  await formReady(page);
  await addLine(page);
  await page
    .getByText('The catalogue could not be loaded. Your own ingredients still work.')
    .waitFor();
  check(true, `${label}: a quiet line says the catalogue could not be loaded`);
  await searchBox(page).fill('Own flour');
  await page.getByRole('button', { name: 'Add Own flour as a new ingredient' }).click();
  await page.getByRole('button', { name: 'Add ingredient', exact: true }).click();
  await page.locator('.picker').waitFor({ state: 'detached' });
  check(
    (await listStore(page, 'ingredients')).map((r) => r.name).join() === 'Own flour',
    `${label}: the picker still creates and chooses the user's own ingredients`,
  );
  await context.close();
};

/**
 * A catalogue pick is stored before it lands on the line. When the next line is added in that
 * moment (both clicks in one task here, so it happens every time), the late pick fills its own
 * line and leaves the new line's picker open.
 */
const latePick = async (browser, origin) => {
  const label = '360px catalogue picker, a pick that lands late';
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await open(page, origin, 'components/new');
  await formReady(page);
  await addLine(page);
  await searchBox(page).fill('garlic');
  await entryButton(page, 'Garlic').waitFor();
  await page.evaluate(() => {
    const pick = [...document.querySelectorAll('.picker-catalogue .picker-choice')].find((b) =>
      b.textContent.startsWith('Garlic'),
    );
    const add = [...document.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === 'Add an ingredient',
    );
    pick.click();
    add.click();
  });
  await page.waitForFunction(() => document.querySelectorAll('.line-edit').length === 2);
  await page.waitForTimeout(300);
  const names = await page.locator('.line-edit .pick-name').allInnerTexts();
  check(
    (await page.locator('.picker').count()) === 1 &&
      (await searchBox(page).isVisible()) &&
      names[0]?.trim() === 'Garlic',
    `${label}: the late pick fills its own line and the new line's picker stays open (${names.join(' | ')})`,
  );
  // Typing an amount while the pick is still being stored: the pick lands and draws the lines
  // again, and the amount field keeps the focus and what is typed (until 2026-11-22 the focus went
  // to the pick button, so the rest of what was typed was lost and the line saved without it; seen
  // as "to taste" in the check of the grams above, about 1 run in 6).
  await open(page, origin, 'components/new');
  await formReady(page);
  await addLine(page);
  await searchBox(page).fill('all-purpose, enriched, bleached');
  await entryButton(page, FLOUR.name).waitFor();
  // In one task: the pick starts storing, and the amount field takes the focus before it lands.
  await entryButton(page, FLOUR.name)
    .first()
    .evaluate((pick) => {
      pick.click();
      document.querySelector('.line-edit input.field').focus();
    });
  await page.locator('.line-edit .picker').waitFor({ state: 'detached' });
  await page.keyboard.type('12');
  const typed = await page.evaluate(() => ({
    value: document.querySelector('.line-edit input.field')?.value,
    focused: document.activeElement === document.querySelector('.line-edit input.field'),
  }));
  check(
    typed.value === '12' && typed.focused,
    `${label}: an amount typed while the pick lands keeps the focus and every key (${JSON.stringify(typed)})`,
  );
  // The same on a dish: a late pick on the first slot leaves the second slot's picker open.
  await open(page, origin, 'dishes/new');
  await formReady(page);
  await page.getByRole('button', { name: 'Add a slot' }).click();
  await searchBox(page).fill('egg, whole, fresh');
  await entryButton(page, 'Egg, whole, fresh').first().waitFor();
  await page.evaluate(() => {
    const pick = [...document.querySelectorAll('.picker-catalogue .picker-choice')].find((b) =>
      (b.getAttribute('aria-label') ?? b.textContent).startsWith('Egg, whole, fresh'),
    );
    const add = [...document.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === 'Add a slot',
    );
    pick.click();
    add.click();
  });
  await page.waitForFunction(() => document.querySelectorAll('.slot-edit').length === 2);
  await page.waitForTimeout(300);
  const slots = await page.locator('.slot-edit .pick-name').allInnerTexts();
  check(
    (await page.locator('.picker').count()) === 1 && slots[0]?.trim() === 'Egg, whole, fresh',
    `${label}: on a dish too, the late pick fills its slot and the new slot's picker stays open (${slots.join(' | ')})`,
  );
  check(problems.length === 0, `${label}: no console error ${problems.join('; ')}`);
  await context.close();
};

export const catalogue = async (browser, server) => {
  const origin = server.origin;
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  const id = await pickAndCompute(page, origin);
  await reload(page, origin, id);
  check(
    problems.length === 0,
    `catalogue: no console errors, CSP violations or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
  await latePick(browser, origin);
  await catalogueTree(browser, origin);
  await catalogueGerman(browser, origin);
  await offline(browser, origin);
  await unavailable(browser, origin);
};
