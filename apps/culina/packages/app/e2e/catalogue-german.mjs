// German names in the picker's catalogue section: a search by a German name or alias finds the
// entry, the row shows that name beside the English one, choosing it stores the record with its
// names, and all of it works offline under the service worker.
import { check, watch } from './harness.mjs';
import { addLine, idsWithChains, rowNamed, searchBox } from './catalogue-helpers.mjs';
import { formReady, listStore, open } from './editor-helpers.mjs';
import { controlled } from './smoke.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SPROUTS = rowNamed('Brussels sprouts'); // de "Rosenkohl", with aliases
const STRAWBERRIES = rowNamed('Strawberries'); // de "Erdbeere"
const text = async (locator) => (await locator.innerText()).replace(/\s+/g, ' ').trim();
const rows = (page) => page.locator('.picker-catalogue .picker-choice');

const searchAndPick = async (page, label, query, row, shownAs) => {
  await searchBox(page).fill(query);
  await rows(page).first().waitFor();
  check(
    (await text(rows(page).first())).startsWith(shownAs),
    `${label}: "${query}" finds ${row.name}, shown as "${shownAs}..."`,
  );
  await page.locator('.picker-catalogue .entry-alt').first().waitFor();
  check(
    (await page.locator('.picker-catalogue .entry-alt').first().getAttribute('lang')) === 'de',
    `${label}: the German name is marked lang="de"`,
  );
  await rows(page).first().click();
  await page.locator('.picker').waitFor({ state: 'detached' });
  const stored = (await listStore(page, 'ingredients')).find((r) => r.id === row.id);
  check(
    same(stored, row) && stored.names.de.name === row.names.de.name,
    `${label}: choosing it stores the catalogue row unchanged, names included`,
  );
};

const online = async (browser, origin) => {
  const label = 'catalogue German';
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await open(page, origin, 'components/new');
  await formReady(page);
  await addLine(page);
  await searchBox(page).fill('Rosenkohl');
  await rows(page).first().waitFor();
  check(
    (await text(rows(page).first())) === `${SPROUTS.name} Rosenkohl by volume`,
    `${label}: the row shows the English name, the German name found, what it converts`,
  );
  await searchBox(page).fill('brussels');
  await rows(page).first().waitFor();
  check(
    (await page.locator('.picker-catalogue .entry-alt').count()) === 0,
    `${label}: a row found by its English name shows no German name`,
  );
  await searchBox(page).fill('kohlsprosse');
  await rows(page).first().waitFor();
  check(
    (await text(rows(page).first())).startsWith(`${SPROUTS.name} Kohlsprosse`),
    `${label}: an alias finds it and is the name shown`,
  );
  await searchBox(page).fill('mehl');
  await rows(page).first().waitFor();
  check(
    (await rows(page).count()) > 0 &&
      (await page.locator('.picker-catalogue .entry-alt').first().innerText())
        .toLowerCase()
        .includes('mehl'),
    `${label}: "mehl" finds flours and meals`,
  );
  await searchAndPick(page, label, 'erdbeere', STRAWBERRIES, `${STRAWBERRIES.name} Erdbeere`);
  check(
    problems.length === 0,
    `${label}: no console errors, CSP violations or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
};

const offline = async (browser, origin) => {
  const label = 'catalogue German offline';
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await page.goto(`${origin}/?e2e-store#/components/new`);
  await formReady(page);
  await controlled(page);
  await context.setOffline(true);
  await page.reload();
  await formReady(page);
  await addLine(page);
  await searchAndPick(page, label, 'Rosenkohl', SPROUTS, `${SPROUTS.name} Rosenkohl`);
  check(
    same((await listStore(page, 'ingredients')).map((r) => r.id).sort(), idsWithChains(SPROUTS)),
    `${label}: offline, the entry found by its German name is in the notebook with its parents`,
  );
  check(
    problems.length === 0,
    `${label}: no console errors, CSP violations or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
};

export const catalogueGerman = async (browser, origin) => {
  await online(browser, origin);
  await offline(browser, origin);
};
