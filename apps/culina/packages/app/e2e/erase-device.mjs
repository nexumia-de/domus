// "Erase everything on this device" in a browser at 360 px: the question names what goes and that
// the stock of the space stays, "Export first" hands over the file, the erase empties the notebook,
// the skill state, drafts and this app's preferences, leaves the stock of the space and the keys of
// other apps, and the app starts again as on a first start. One tab only: a second open tab keeps
// its cache until it is reloaded (not checked here).
import { check, watch } from './harness.mjs';
import { layout } from './editor-helpers.mjs';
import { OWN, listAll, putAll } from './exchange-fixture.mjs';
import { addStock, stockRecords } from './stock-helpers.mjs';

const label = '360px erase everything on this device';

const openAt = async (page, origin, hash) => {
  await page.goto('about:blank');
  await page.goto(`${origin}/?no-sw&e2e-store#/${hash}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
};

export const eraseDevice = async (browser, server) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    acceptDownloads: true,
  });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  const origin = server.origin;
  await openAt(page, origin, 'settings');
  check((await putAll(page, OWN)) === 'ok', `${label}: own records and skill state are stored`);
  await page.evaluate(async () => {
    const opened = await globalThis.__culinaStore;
    await opened.store.drafts.put('component:new', { name: 'Half written' });
    localStorage.setItem('culina.theme', 'dark');
    localStorage.setItem('culina.dishes', '{"origin":"own"}');
    localStorage.setItem('mixtura.sentinel', 'kept');
  });
  await addStock(page, [{ ref: { kind: 'ingredient', id: OWN.ingredients[0].id } }]);
  const stockBefore = await stockRecords(page);
  check(Object.keys(stockBefore).length === 1, `${label}: one stock record in the space`);

  await openAt(page, origin, 'settings');
  await page.getByRole('button', { name: 'Erase everything on this device' }).click();
  const ask = page.locator('.erase-what');
  await ask.waitFor();
  const question = await ask.innerText();
  check(
    question ===
      "Erase from this device: 2 ingredients, 4 component versions, 1 dish versions, 2 tasting notes, 2 skill marks, 1 unsaved draft, this app's settings (theme, language, filters, reminder)?",
    `${label}: the question names what goes, with counts (${question})`,
  );
  check(
    (await page.locator('.erase-stock').innerText()).startsWith('The stock of “Home” stays'),
    `${label}: the question says the stock of the space stays`,
  );
  check(
    (await page.getByRole('dialog').count()) === 0,
    `${label}: the question is an inline row, not a dialog`,
  );
  await layout(page, `${label} (question)`);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export first' }).click(),
  ]);
  check(
    /^cooks-notebook-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()) &&
      (await ask.count()) === 1,
    `${label}: "Export first" hands over the file and the question stays open`,
  );
  await page.getByRole('button', { name: 'Cancel' }).click();
  check((await ask.count()) === 0, `${label}: Cancel closes the question and erases nothing`);
  check(
    (await listAll(page)).skills.length === 2,
    `${label}: after Cancel the data is still there`,
  );

  await page.getByRole('button', { name: 'Erase everything on this device' }).click();
  await ask.waitFor();
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Erase everything', exact: true }).click(),
  ]);
  await page.getByRole('heading', { level: 1 }).waitFor();
  const after = await listAll(page);
  check(
    Object.values(after).every((list) => list.length === 0),
    `${label}: the notebook and the skill state are empty after the erase`,
  );
  const left = await page.evaluate(async () => {
    const opened = await globalThis.__culinaStore;
    const drafts = await opened.store.drafts.list();
    return {
      drafts: drafts.drafts.length,
      keys: Object.keys(localStorage).sort(),
      theme: document.documentElement.getAttribute('data-theme'),
      hash: location.hash,
    };
  });
  check(left.drafts === 0, `${label}: drafts are gone`);
  check(
    !left.keys.some((k) => k.startsWith('culina.')) && left.keys.includes('mixtura.sentinel'),
    `${label}: this app's preferences are gone, another app's key stays (${left.keys.join(', ')})`,
  );
  check(
    left.theme === null && left.hash === '#/start',
    `${label}: the app starts again at its first screen with the default theme (${left.theme} ${left.hash})`,
  );
  check(
    JSON.stringify(await stockRecords(page)) === JSON.stringify(stockBefore),
    `${label}: the stock of the space is untouched`,
  );
  check(problems.length === 0, `${label}: no console error, CSP violation or foreign request`);
  if (problems.length) console.log(problems.join('\n'));
  await context.close();
};
