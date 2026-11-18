// Smoke tests: shell, navigation, targets, theme, offline, no foreign requests.
import { check, watch } from './harness.mjs';

const ROUTES = ['ratios', 'components', 'dishes', 'stock', 'settings'];
const NAMES = {
  ratios: 'Ratios',
  components: 'Components',
  dishes: 'Dishes',
  stock: 'Stock',
  settings: 'Settings',
};

const measure = (page) =>
  page.evaluate(() => {
    const box = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    return {
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      nav: box('nav'),
      main: box('main'),
      targets: [...document.querySelectorAll('nav a, summary, .choice')].map((n) => {
        const r = n.getBoundingClientRect();
        return { name: n.textContent.trim(), w: r.width, h: r.height };
      }),
    };
  });

const shellAt = async (browser, origin, width, height) => {
  const context = await browser.newContext({ viewport: { width, height } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await page.goto(`${origin}/?no-sw#/ratios`);
  await page.getByRole('heading', { level: 1, name: 'Ratios' }).waitFor();
  const phone = width < 720;
  const first = await page.evaluate(() => document.activeElement === document.body);
  check(first, `${width}px: nothing is focused when the screen opens`);

  for (const route of ROUTES) {
    await page.goto(`${origin}/?no-sw#/${route}`);
    await page.getByRole('heading', { level: 1, name: NAMES[route] }).waitFor();
    const m = await measure(page);
    check(
      m.scrollW <= m.clientW,
      `${width}px #/${route}: no horizontal scroll (${m.scrollW} <= ${m.clientW})`,
    );
    const bottom = m.nav.y > m.main.y;
    check(
      phone ? bottom && m.nav.w >= width - 1 : m.nav.x < m.main.x && m.nav.w < 300,
      `${width}px #/${route}: ${phone ? 'bottom' : 'side'} navigation`,
    );
    const small = m.targets.filter((t) => t.w < 44 || t.h < 44);
    check(
      small.length === 0,
      `${width}px #/${route}: targets at least 44 x 44 (${m.targets.length} checked)${small.length ? ' ' + JSON.stringify(small) : ''}`,
    );
    const current = await page.locator('nav [aria-current="page"]').allTextContents();
    check(
      current.length === 1 && current[0].trim() === NAMES[route],
      `${width}px #/${route}: aria-current on ${NAMES[route]}`,
    );
  }

  const landmarks = await page.evaluate(() => ({
    header: document.querySelectorAll('body header').length,
    nav: document.querySelectorAll('nav[aria-label]').length,
    main: document.querySelectorAll('main').length,
    unnamed: [...document.querySelectorAll('a, button, input, summary')].filter(
      (n) =>
        !(
          n.getAttribute('aria-label') ||
          n.textContent.trim() ||
          n.labels?.[0]?.textContent.trim()
        ),
    ).length,
  }));
  check(
    landmarks.header === 1 && landmarks.nav === 1 && landmarks.main === 1,
    `${width}px: one header, one labelled nav, one main`,
  );
  check(landmarks.unnamed === 0, `${width}px: every link, button and input has a name`);

  // Keyboard: Tab reaches the navigation with a visible focus ring; Enter navigates and moves focus to the heading.
  await page.goto('about:blank');
  await page.goto(`${origin}/?no-sw#/ratios`);
  await page.getByRole('heading', { level: 1, name: 'Ratios' }).waitFor();
  await page.keyboard.press('Tab');
  const skip = await page.evaluate(() => document.activeElement.className);
  check(skip === 'skip-link', `${width}px: first Tab is the skip link`);
  await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return {
      text: document.activeElement.textContent.trim(),
      width: parseFloat(s.outlineWidth),
      style: s.outlineStyle,
    };
  });
  check(
    ring.style !== 'none' && ring.width >= 3,
    `${width}px: visible focus ring on "${ring.text}"`,
  );
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { level: 1, name: 'Components' }).waitFor();
  const focused = await page.evaluate(
    () => document.activeElement.tagName + ':' + document.activeElement.textContent,
  );
  check(focused === 'H1:Components', `${width}px: after keyboard navigation the heading has focus`);
  await page.goBack();
  await page.getByRole('heading', { level: 1, name: 'Ratios' }).waitFor();
  check(true, `${width}px: browser back returns to Ratios (one back stack)`);

  await page.goto(`${origin}/?no-sw#/nope`);
  await page.getByRole('heading', { level: 1, name: 'Ratios' }).waitFor();
  check(page.url().endsWith('#/ratios'), `${width}px: unknown route becomes #/ratios`);

  check(
    problems.length === 0,
    `${width}px: no console errors, CSP violations or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
};

const theme = async (browser, origin) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    colorScheme: 'light',
  });
  const problems = watch(context, origin);
  const page = await context.newPage();
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const attr = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.goto(`${origin}/?no-sw#/settings`);
  await page.getByRole('heading', { level: 1, name: 'Settings' }).waitFor();
  check(
    await page.getByRole('radio', { name: 'Follow system' }).isChecked(),
    'theme: Follow system is the default',
  );
  const light = await bg();
  await page.getByText('Dark', { exact: true }).click();
  const dark = await bg();
  check(
    (await attr()) === 'dark' && dark !== light,
    `theme: Dark sets data-theme and changes the background (${light} -> ${dark})`,
  );
  await page.reload();
  check((await attr()) === 'dark' && (await bg()) === dark, 'theme: Dark survives a reload');
  check(
    await page.getByRole('radio', { name: 'Dark' }).isChecked(),
    'theme: the radio shows the kept choice',
  );
  await page.getByText('Follow system', { exact: true }).click();
  check(
    (await attr()) === null && (await bg()) === light,
    'theme: Follow system removes data-theme (system is light)',
  );
  await page.emulateMedia({ colorScheme: 'dark' });
  check((await bg()) === dark, 'theme: Follow system follows a dark system');
  await page.getByText('Light', { exact: true }).click();
  check((await bg()) === light, 'theme: Light overrides a dark system');
  check(problems.length === 0, 'theme: no console errors or foreign requests');
  await context.close();
};

/** Loads with the service worker, waits until it controls the page, goes offline and reloads. */
export const controlled = async (page) => {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        if (navigator.serviceWorker.controller) return resolve();
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve());
      }),
  );
};

const offline = async (browser, origin, label) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, new URL(origin).origin);
  const page = await context.newPage();
  await page.goto(origin);
  await page.getByRole('heading', { level: 1, name: 'Ratios' }).waitFor();
  await controlled(page);
  check(true, `${label}: the service worker controls the page`);
  const names = await page.evaluate(() => caches.keys());
  check(
    names.length === 1 && /^culina-[0-9a-f]{16}$/.test(names[0]),
    `${label}: one versioned cache (${names})`,
  );
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { level: 1, name: 'Ratios' }).waitFor();
  await page.getByRole('link', { name: 'Dishes' }).click();
  await page.getByRole('heading', { level: 1, name: 'Dishes' }).waitFor();
  await page.goto(new URL('#/settings', page.url()).href);
  await page.reload();
  await page.getByRole('heading', { level: 1, name: 'Settings' }).waitFor();
  check(true, `${label}: offline reload renders the shell and navigates`);
  const styled = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)',
  );
  check(styled, `${label}: offline the stylesheet applies`);
  check(
    problems.length === 0,
    `${label}: no console errors or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
};

export const smoke = async (browser, server, subServer) => {
  await shellAt(browser, server.origin, 320, 640);
  await shellAt(browser, server.origin, 360, 720);
  await shellAt(browser, server.origin, 1000, 700);
  await theme(browser, server.origin);
  await offline(browser, server.url, 'offline');
  await offline(browser, subServer.url, 'offline under a sub-path');
};
