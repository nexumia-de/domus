// Stage 3 of a run: every screen against the touch and keyboard rules, the settings screen,
// and the app offline. The language switch comes last because it reloads the page.
import { add, tapAudit, goTo, ok, openApp, rows, unreachedByTab } from './driver.mjs';

/** Taps under 44 px, horizontal overflow and keys that do not reach a control, per screen. */
export async function screensStage(run, { page }) {
  const { t, server } = run;
  const screens = [
    ['list', '#/', async () => page.waitForSelector('.entry')],
    [
      'entry',
      '#/',
      async () => {
        await page.locator('.entry-text').first().click();
        await page.waitForSelector('.entry-form');
      },
    ],
    ['categories', '#/categories', async () => page.waitForSelector('.category')],
    [
      'categories (a name being typed)',
      '#/categories',
      async () => {
        await page
          .locator('.category')
          .first()
          .getByRole('button', { name: t.categories.rename })
          .click();
        await page.waitForSelector('.category-rename');
      },
    ],
    ['settings', '#/settings', async () => page.waitForSelector('.choice')],
  ];
  for (const [name, hash, prepare] of screens) {
    await page.goto(`${server.origin}/${hash}`);
    await page.reload(); // a hash change alone would keep the old screen's page state
    await prepare();
    await ok(run, `${name}: no tap target under 44 px, no horizontal overflow`, async () => {
      const a = await tapAudit(page);
      if (a.small.length || a.overflow > 0) console.log('     ', JSON.stringify(a));
      return a.small.length === 0 && a.overflow <= 0;
    });
    await ok(run, `${name}: every control is reached by Tab`, async () => {
      const missed = await unreachedByTab(page);
      if (missed.length) console.log('      not reached:', missed.join('; '));
      return missed.length === 0;
    });
  }
}

export async function settingsStage(run, { page }) {
  const { t, server, other } = run;
  await page.goto(`${server.origin}/#/settings`);
  await page.waitForSelector('.choice');
  await ok(
    run,
    'settings: the space with its status',
    async () =>
      (await page.locator('.choice-name').innerText()) === t.space.home &&
      (await page.locator('.choice-status').innerText()) === t.status.deviceOnly,
  );
  await ok(run, 'settings: the link to the Household app points at ../', async () => {
    const link = page.getByRole('link', { name: t.settings.household, exact: true });
    return (
      (await link.getAttribute('href')) === '../' &&
      (await link.evaluate((a) => a.href)) === `${server.origin}/`
    );
  });
  await ok(run, 'settings: "Home in Household" links to that space in Household', async () =>
    /^\.\.\/#\/spaces\/.+/.test(await page.locator('.choice-link').getAttribute('href')),
  );

  const root = page.locator('html');
  await page.locator('#theme').selectOption('dark');
  await ok(
    run,
    'settings: the theme choice sets data-theme on the root element',
    async () => (await root.getAttribute('data-theme')) === 'dark',
  );
  await page.reload();
  await page.waitForSelector('.choice');
  await ok(
    run,
    'settings: the theme survives a reload (and is still the selected option)',
    async () =>
      (await root.getAttribute('data-theme')) === 'dark' &&
      (await page.locator('#theme').inputValue()) === 'dark',
  );
  await page.locator('#theme').selectOption('light');
  await ok(
    run,
    'settings: another theme replaces it',
    async () => (await root.getAttribute('data-theme')) === 'light',
  );
  await page.locator('#theme').selectOption('system');
  await ok(
    run,
    'settings: "as the device" removes data-theme',
    async () => (await root.getAttribute('data-theme')) === null,
  );

  const reloaded = page.waitForEvent('load');
  await page.locator('#lang').selectOption(other.code);
  await reloaded;
  await page.waitForFunction((l) => document.documentElement.lang === l, other.code);
  await page.waitForSelector('.choice');
  await ok(
    run,
    `settings: switching the language reloads with the ${other.code} texts`,
    async () =>
      (await page.locator('h1').innerText()) === other.t.settings.title &&
      (await page.locator('.app-title').innerText()) === other.t.appName &&
      (await page.locator('.choice-name').innerText()) === t.space.home,
  );
  await page.locator('#lang').selectOption('device');
  await page.waitForFunction((l) => document.documentElement.lang === l, run.lang);
  await ok(
    run,
    'settings: "as the device" brings the device language back',
    async () => (await page.locator('h1').innerText()) === t.settings.title,
  );
}

/** With the service worker active, the context goes offline: the list is there and usable. */
export async function offlineStage(run, { page, context }) {
  const { t, server } = run;
  await openApp(page, server.origin);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // the worker controls the page from this load on
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  const before = (await rows(page)).length;
  await context.setOffline(true);
  try {
    await page.reload();
    await page.waitForSelector('.entry');
    await ok(
      run,
      'offline: after a reload the list is still there',
      async () => (await rows(page)).length === before && before > 0,
    );
    await add(page, t, 'Eggs', { amount: '10' });
    await ok(run, 'offline: an entry can be added', async () =>
      (await rows(page)).some((r) => r.name === 'Eggs'),
    );
    await page.reload();
    await page.waitForSelector('.entry');
    await ok(run, 'offline: the entry added offline is kept over a reload', async () =>
      (await rows(page)).some((r) => r.name === 'Eggs'),
    );
    await goTo(page, '#/settings', t.settings.title);
    await ok(run, 'offline: the settings screen opens', () => page.locator('.choice').count());
  } finally {
    await context.setOffline(false);
  }
}
