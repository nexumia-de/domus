// The hand-over on a dish's page (docs/behaviour.md, The offer on a dish's page): the offer under
// the ingredients, reached by the app's own navigation (the Cook list, a link by address, Back)
// and opened with one click; the confirmation, the message, a hand-over that writes nothing,
// one Undo for every hand-over of the page, other portions with the amounts that differ, a free
// name ticked by hand, a refused write; in English at 360 px and in German at a wide width, on
// the real shipped files with a prepared stock (four eggs). In English also: the module that does
// not load, and a module of another build. The list is read straight from the shared database
// `domus`, without app code. Not proved here: that Emptio shows the entries (the site e2e,
// scripts/site-e2e.mjs, does), two spaces (unit tests), a real phone or screen reader, a list
// synced to a storage. The refused write is a put that throws in this page's IndexedDB, not a
// full disk; the other build is this build's module with its id changed.
import { readFileSync } from 'node:fs';
import { check, distDir, watch } from './harness.mjs';
import { addStock } from './stock-helpers.mjs';

const EGG = 'fdc-group-egg-whole';

/** The live entries of the list of every space: `{ key, value }`. */
const listEntries = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('domus');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const all = db.transaction('collections').objectStore('collections').getAll();
          all.onsuccess = () => {
            db.close();
            resolve(
              all.result
                .filter((row) => row.name === 'list')
                .flatMap((row) => row.records ?? [])
                .filter((r) => r.deleted !== true && r.value !== undefined),
            );
          };
          all.onerror = () => reject(all.error);
        };
      }),
  );

const TEXT = {
  en: {
    locale: 'en-US',
    dish: 'Pan-fried meat loaf',
    offer: (n) => `The stock lacks ${n} ingredients for this.`,
    offerSome: (n, k) =>
      `The stock lacks ${n} ingredients for this; ${k} of them on the shopping list as needed now.`,
    offerDone: (n) => `The ${n} ingredients the stock lacks for this are on the shopping list.`,
    open: 'Put on the shopping list',
    put: (n) => `Put ${n} on the list`,
    salt: 'Salt',
    beef: 'Beef',
    crumbs: 'Breadcrumbs',
    suet: 'Kidney suet',
    egg: 'Eggs',
    said: (n) => `Put ${n} on the shopping list.`,
    onlyThere: (name) => `${name}: on the shopping list already.`,
    withThere:
      'Put 1 on the shopping list. 1 was on it already. For 1 of them the list has a different amount from what the dish needs now; the list was not changed.',
    differs: (name) => `${name}: on the list 28 g, needed now 85 g`,
    took: 'Taken off the list: ',
    backAsBefore: 'Back as before',
    link: 'Open the shopping list',
    undo: 'Undo',
    more: 'More portions',
    fewer: 'Fewer portions',
    refused: 'The shopping list could not be written. Nothing was put on it.',
    loadProblem: 'This could not be opened. Try again.',
    updated: 'Cook’s Workbench was updated. Reload it to use the shopping list.',
    burrito: 'Burritos with rice',
  },
  de: {
    locale: 'de-DE',
    dish: 'Frikandelle',
    offer: (n) => `Laut Vorrat sind dafür noch ${n} Zutaten nötig.`,
    offerSome: (n, k) =>
      `Laut Vorrat sind dafür noch ${n} Zutaten nötig, ${k} davon wie jetzt gebraucht auf der Einkaufsliste.`,
    offerDone: (n) =>
      `Die ${n} Zutaten, die laut Vorrat dafür nötig sind, stehen auf der Einkaufsliste.`,
    open: 'Auf die Einkaufsliste',
    put: (n) => `${n} auf die Liste setzen`,
    salt: 'Salz',
    beef: 'Rindfleisch',
    crumbs: 'Semmelbrösel',
    suet: 'Nierenfett',
    egg: 'Eier',
    said: (n) => `${n} auf die Einkaufsliste gesetzt.`,
    onlyThere: (name) => `${name}: schon auf der Einkaufsliste.`,
    withThere:
      '1 auf die Einkaufsliste gesetzt. 1 stand schon darauf. Bei 1 davon hat die Liste eine andere Menge, als das Gericht jetzt braucht; die Liste blieb unverändert.',
    differs: (name) => `${name}: auf der Liste 28 g, jetzt gebraucht 85 g`,
    took: 'Von der Liste genommen: ',
    backAsBefore: 'Wieder wie vorher',
    link: 'Einkaufsliste öffnen',
    undo: 'Rückgängig',
    more: 'Mehr Portionen',
    fewer: 'Weniger Portionen',
    refused:
      'Die Einkaufsliste konnte nicht geschrieben werden. Es wurde nichts auf die Liste gesetzt.',
    burrito: 'Burritos mit Reis',
  },
};

/**
 * Eggs in stock, as the Stock screen leaves them: the catalogue's egg and the entries above it
 * copied into the notebook (as `adoptEntry` does), then a batch of `count` eggs.
 */
const stockEggs = async (page, count) => {
  const failed = await page.evaluate(async (id) => {
    const catalogue = await (await fetch('catalogue.json')).json();
    const byId = new Map(catalogue.ingredients.map((e) => [e.id, e]));
    const chain = [];
    for (let at = byId.get(id); at !== undefined; at = byId.get(at.parentId)) chain.unshift(at);
    const opened = await globalThis.__culinaStore;
    const out = [];
    for (const record of chain) {
      const done = await opened.store.put('ingredients', record);
      if (!done.ok) out.push(`${record.id}: ${JSON.stringify(done.error)}`);
    }
    return out;
  }, EGG);
  if (failed.length > 0) throw new Error(`eggs not stored: ${failed.join('; ')}`);
  await addStock(page, [
    { ref: { kind: 'ingredient', id: EGG }, amount: { value: count, unit: 'count' } },
  ]);
};

const countText = (page) => page.locator('.handover-count').innerText();
const offerCount = async (page) => Number(/\d+/.exec(await countText(page))?.[0]);
const waitCount = (page, text) =>
  page.waitForFunction(
    (want) => document.querySelector('.handover-count')?.textContent === want,
    text,
  );
const waitSaid = (page, text) =>
  page.waitForFunction(
    (want) => document.querySelector('.handover-said p')?.textContent === want,
    text,
  );
const opensOnce = async (page, t) => {
  await page.getByRole('button', { name: t.open }).click();
  return page
    .locator('.handover-confirm')
    .waitFor({ timeout: 3000 })
    .then(
      () => true,
      () => false,
    );
};
const portionsBy = async (page, t, steps) => {
  const name = steps > 0 ? t.more : t.fewer;
  for (let i = 0; i < Math.abs(steps); i += 1) await page.getByRole('button', { name }).click();
};
/** Opens a fresh page of the app at an address, as a reload does. */
const load = async (page, origin, hash) => {
  await page.goto('about:blank');
  await page.goto(`${origin}/?no-sw&e2e-store#/${hash}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
};

const run = async (browser, server, lang, width) => {
  const t = TEXT[lang];
  const label = `${width}px ${lang} hand-over`;
  const context = await browser.newContext({
    viewport: { width, height: 800 },
    locale: t.locale,
    serviceWorkers: 'block',
  });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  await load(page, server.origin, 'classic/frikandelle');
  await page.locator('.recipe-block').first().waitFor();
  check(
    (await page.locator('.handover').count()) === 0,
    `${label}: with nothing in stock there is no offer (an empty stock would offer every line)`,
  );
  await stockEggs(page, 4);

  // Reached by the app's own navigation: the Cook list, then the dish's row.
  await load(page, server.origin, 'cook');
  await page.locator('.dish-rows .dish-row').first().waitFor();
  await page.locator('.dish-rows .dish-row', { hasText: t.dish }).first().click();
  await page.getByRole('heading', { level: 1, name: new RegExp(`^${t.dish}`) }).waitFor();
  await page.locator('.handover-offer').waitFor();
  const n = await offerCount(page);
  check(
    (await countText(page)) === t.offer(n) && n > 1,
    `${label}: with four eggs in stock, the dish for 4 says what lacks (${await countText(page)})`,
  );
  check(
    await page.evaluate(() => {
      const block = document.querySelector('.recipe-block');
      return block !== null && block.nextElementSibling === document.querySelector('.handover');
    }),
    `${label}: the offer stands right under the ingredients`,
  );

  // Portions: at 8 the eggs are short too, at 4 again not (the control).
  await portionsBy(page, t, 4);
  await page.waitForFunction(
    (want) => document.querySelector('.handover-count')?.textContent?.includes(String(want)),
    n + 1,
  );
  check((await offerCount(page)) === n + 1, `${label}: at 8 portions the eggs lack too (${n + 1})`);
  await portionsBy(page, t, -4);
  await waitCount(page, t.offer(n));
  check(true, `${label}: back at 4 portions the offer says ${n} again`);

  // The confirmation, opened with one click on a dish reached from the list.
  check(
    await opensOnce(page, t),
    `${label}: one click opens the confirmation (dish reached from the Cook list)`,
  );
  const section = page.locator('.handover-confirm');
  const lineBoxes = section.locator('.handover-lines:not(.handover-free) input[type=checkbox]');
  const freeBoxes = section.locator('.handover-free input[type=checkbox]');
  const tick = (name) => section.getByRole('checkbox', { name: new RegExp(`^${name}`) });
  check(
    (await page.evaluate(() => document.activeElement?.matches('.handover-confirm input'))) ===
      true,
    `${label}: opening moves the focus to the first line`,
  );
  check(
    (await lineBoxes.count()) === n &&
      (await lineBoxes.evaluateAll((b) => b.every((x) => x.checked))) &&
      (await freeBoxes.count()) === 2 &&
      (await freeBoxes.evaluateAll((b) => b.every((x) => !x.checked))),
    `${label}: ${n} lines ticked, the two names the catalogue lacks unticked`,
  );
  check(
    (await tick(t.salt).count()) === 1 && (await tick(t.suet).count()) === 1,
    `${label}: the lines are named in the cook's language (${t.salt}, ${t.suet})`,
  );
  check(
    (await page.locator('.handover-open').getAttribute('aria-expanded')) === 'true',
    `${label}: the offer says it is expanded`,
  );
  await page.keyboard.press('Escape');
  await section.waitFor({ state: 'detached' });
  check(
    (await page.evaluate(() => document.activeElement?.classList.contains('handover-open'))) ===
      true,
    `${label}: Escape closes it and gives the focus back to the offer`,
  );
  await page.getByRole('button', { name: t.open }).click();
  await section.waitFor();
  await tick(t.salt).uncheck();
  await tick(t.suet).check();
  check(
    (await section.locator('.handover-put').innerText()) === t.put(n),
    `${label}: one line unticked, one free name ticked by hand: the button puts ${n}`,
  );
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
    `${label}: no horizontal scroll with the confirmation open`,
  );
  await section.locator('.handover-put').click();
  await waitSaid(page, t.said(n));
  const said = page.locator('.handover-said');
  check(
    await page.evaluate(
      () =>
        document.activeElement?.classList.contains('handover-said') &&
        getComputedStyle(document.activeElement).outlineStyle === 'none',
    ),
    `${label}: the message says what happened and has the focus, without a ring after a click`,
  );
  const link = page.getByRole('link', { name: t.link });
  check(
    (await link.evaluate((a) => a.href)) === `${server.origin}/emptio/` &&
      (await link.getAttribute('target')) === '_blank',
    `${label}: the way to the shopping list is ../emptio/, in a new tab`,
  );
  let entries = await listEntries(page);
  const names = entries.map((e) => e.value.name);
  check(
    entries.length === n &&
      !names.includes(t.salt) &&
      names.includes(t.suet) &&
      entries.find((e) => e.value.name === t.suet)?.value.amount === undefined &&
      entries.every((e) =>
        e.value.origins?.some((o) => o.app === 'culina' && o.dish === 'shipped:frikandelle'),
      ),
    `${label}: the list holds ${n} entries, not the unticked salt, the free name without an amount, each naming the dish (${names.join(', ')})`,
  );
  check(
    (await countText(page)) === t.offerSome(n, n - 1),
    `${label}: the offer counts what this page put on the list (${await countText(page)})`,
  );

  // A hand-over that writes nothing keeps the Undo of the one before.
  await page.getByRole('button', { name: t.open }).click();
  await section.waitFor();
  check(
    !(await tick(t.beef).isChecked()) && !(await tick(t.salt).isChecked()),
    `${label}: lines this page listed are unticked when it opens again; the salt stays as the cook left it`,
  );
  check(
    !(await tick(t.suet).isChecked()),
    `${label}: the free name handed over is unticked when it opens again`,
  );
  await tick(t.beef).check();
  await section.locator('.handover-put').click();
  await waitSaid(page, t.onlyThere(t.beef));
  check(
    (await page.getByRole('button', { name: t.undo }).count()) === 1 &&
      (await listEntries(page)).length === n,
    `${label}: handed again, the line there already is said by its name; nothing doubled, and Undo of the first hand-over stays`,
  );
  // A second hand-over that writes: one Undo for both.
  await page.getByRole('button', { name: t.open }).click();
  await section.waitFor();
  await tick(t.salt).check();
  await section.locator('.handover-put').click();
  await waitSaid(page, t.said(1));
  await waitCount(page, t.offerDone(n));
  check(
    (await page.getByRole('button', { name: t.open }).count()) === 0,
    `${label}: with every lacking line on the list from this page, the offer says so and has no button`,
  );
  await page.getByRole('button', { name: t.undo }).click();
  await page.waitForFunction(
    (took) => document.querySelector('.handover-said p')?.textContent?.startsWith(took),
    t.took,
  );
  const undoneText = (await said.innerText()).trim();
  entries = await listEntries(page);
  check(
    entries.length === 0 &&
      undoneText.includes(t.salt) &&
      undoneText.includes(t.beef) &&
      (await page.getByRole('button', { name: t.undo }).count()) === 0,
    `${label}: Undo takes back both hand-overs that wrote, says so, the list is empty (${undoneText})`,
  );
  await waitCount(page, t.offer(n));

  // A refused write: nothing on the list, the cook is told.
  await page.evaluate(() => {
    globalThis.__realPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('refused for the check', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: t.open }).click();
  await section.locator('.handover-put').click();
  await waitSaid(page, t.refused);
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = globalThis.__realPut;
  });
  check(
    (await listEntries(page)).length === 0 &&
      (await page.getByRole('link', { name: t.link }).count()) === 0,
    `${label}: a refused write says so, and nothing is on the list`,
  );

  // Other portions: the eggs are new; a line ticked by hand is there with another amount.
  await page.getByRole('button', { name: t.open }).click();
  await section.locator('.handover-put').click();
  await waitSaid(page, t.said(n));
  await portionsBy(page, t, 4);
  // The breadcrumbs were handed at 28 g: at 85 g they are not counted as on the list as needed.
  await waitCount(page, t.offerSome(n + 1, n - 1));
  await page.getByRole('button', { name: t.open }).click();
  await section.waitFor();
  check(
    await tick(t.crumbs).isChecked(),
    `${label}: a line handed at other portions is ticked again`,
  );
  await section.locator('.handover-put').click();
  await waitSaid(page, t.withThere);
  const differences = await page.locator('.handover-differences li').allInnerTexts();
  check(
    differences.length === 1 &&
      differences[0] === t.differs(t.crumbs) &&
      (await page.locator('.handover-said .handover-differences').count()) === 0 &&
      (await listEntries(page)).some((e) => e.value.name === t.egg),
    `${label}: at other portions the eggs are put on; one sentence says amounts differ, the line is listed apart from the status (${differences.join('; ')})`,
  );
  await waitCount(page, t.offerDone(n + 1));
  await portionsBy(page, t, -4);
  await waitCount(page, t.offerSome(n, n - 1));
  check(
    (await page.getByRole('button', { name: t.open }).count()) === 1,
    `${label}: back at the portions handed first, the amount differs from the last hand-over and the offer keeps its button`,
  );
  await page.getByRole('button', { name: t.undo }).click();
  await page.waitForFunction(() => document.querySelector('.handover-undo') === null);

  // Another dish by its address, then Back: each opens with one click.
  await page.evaluate(() => (window.location.hash = '#/classic/burrito'));
  await page.getByRole('heading', { level: 1, name: new RegExp(`^${t.burrito}`) }).waitFor();
  await page.locator('.handover-offer').waitFor();
  check(
    (await page.locator('.handover-said').count()) === 0,
    `${label}: another dish shows no message of the one before`,
  );
  check(await opensOnce(page, t), `${label}: another dish by its address opens with one click`);
  const shipped = await offerCount(page);
  await section.locator('.handover-put').click();
  await page.locator('.handover-said').waitFor();
  const sauce = page
    .locator('.filling-choice select')
    .filter({ has: page.locator('option[value="guacamole-sauce"]') });
  await sauce.selectOption('guacamole-sauce');
  await page.waitForFunction(
    (was) => !document.querySelector('.handover-count')?.textContent?.includes(` ${was} `),
    shipped,
  );
  const chosen = await offerCount(page);
  await page.getByRole('button', { name: t.open }).click();
  await section.waitFor();
  check(
    chosen !== shipped &&
      (await section.locator('.handover-line', { hasText: /Avocado/ }).count()) === 1,
    `${label}: with the guacamole chosen the offer follows (${shipped} → ${chosen}) and lists the avocados`,
  );
  // Only the salt, which joins the entry the shipped sauce made (another dish by its key).
  await section
    .locator('.handover-lines:not(.handover-free) input[type=checkbox]')
    .evaluateAll((boxes) => boxes.forEach((b) => b.checked && b.click()));
  await tick(t.salt).check();
  await section.locator('.handover-put').click();
  await page.waitForFunction(() =>
    document.querySelector('.handover-said p')?.textContent?.includes(', '),
  );
  await page.getByRole('button', { name: t.undo }).click();
  await page.waitForFunction(
    (took) => document.querySelector('.handover-said p')?.textContent?.startsWith(took),
    t.took,
  );
  const both = (await said.innerText()).trim();
  check(
    both.includes(t.salt) &&
      !both.includes(t.backAsBefore) &&
      (await listEntries(page)).length === 0,
    `${label}: Undo of both burrito hand-overs says the salt was taken off, not put back as before; the list is empty (${both})`,
  );
  await page.goBack();
  await page.getByRole('heading', { level: 1, name: new RegExp(`^${t.dish}`) }).waitFor();
  await page.locator('.handover-offer').waitFor();
  check(await opensOnce(page, t), `${label}: Back to the first dish opens with one click`);
  check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
  await context.close();
};

/** The module that does not load, and one of another build: said, and the button stays. */
const loading = async (browser, server) => {
  const t = TEXT.en;
  const label = '360px en hand-over';
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    locale: t.locale,
    serviceWorkers: 'block',
  });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  await load(page, server.origin, 'classic/frikandelle');
  await page.locator('.recipe-block').first().waitFor();
  await stockEggs(page, 4);
  await load(page, server.origin, 'classic/frikandelle');
  await page.locator('.handover-offer').waitFor();
  await page.route('**/hand-over.js', (route) => route.abort());
  await page.getByRole('button', { name: t.open }).click();
  await page.locator('.handover-problem').waitFor();
  check(
    (await page.locator('.handover-problem').innerText()) === t.loadProblem &&
      (await page.locator('.handover-confirm').count()) === 0,
    `${label}: a module that does not load is said in a status line`,
  );
  await page.unroute('**/hand-over.js');
  check(await opensOnce(page, t), `${label}: the button stays; the next click opens it`);

  // A main.js of this build and a hand-over.js of another (the app updated while open).
  const main = readFileSync(`${distDir}main.js`, 'utf8');
  const module = readFileSync(`${distDir}hand-over.js`, 'utf8');
  const id = [...module.matchAll(/"([0-9a-f]{16})"/g)]
    .map((m) => m[1])
    .find((x) => main.includes(`"${x}"`));
  await page.route('**/hand-over.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: module.replace(`"${id}"`, '"0000000000000000"'),
    }),
  );
  await load(page, server.origin, 'classic/frikandelle');
  await page.locator('.handover-offer').waitFor();
  await page.getByRole('button', { name: t.open }).click();
  await page.locator('.handover-problem').waitFor();
  check(
    id !== undefined &&
      (await page.locator('.handover-problem').innerText()) === t.updated &&
      (await page.locator('.handover-confirm').count()) === 0,
    `${label}: a module of another build is refused: reload the app`,
  );
  const real = problems.filter((p) => !p.includes('Failed to load resource'));
  check(real.length === 0, `${label}: no unhandled rejection or page error ${real}`);
  await context.close();
};

export const handOver = async (browser, server) => {
  await run(browser, server, 'en', 360);
  await run(browser, server, 'de', 1280);
  await loading(browser, server);
};
