// The navigation: three destinations (Cook, Notebook, Ratios; docs/decisions/cook-screen.md) in the
// bottom bar, Settings as a gear in the header, in English and German, at 320 and 360 px (and, with
// E2E_WIDE_FONT=1, in the wide font the CI runner has). Each label is on one line and nothing is cut
// off. The Notebook carries its two parts at the top; Cook is one screen with no parts and no views,
// with the way to the stock. Every address of Cook marks Cook, every dish (own or shipped) marks the
// Notebook. The old addresses #/start, #/cook/use-up and #/classics land on Cook without a new
// history entry. Every former destination is reachable from Cook in at most two taps, the stock
// from anywhere in two.
import { check, watch } from './harness.mjs';
import { overflow } from './measure.mjs';

const LANGS = {
  en: {
    names: ['Cook', 'Notebook', 'Ratios'],
    settings: 'Settings',
    stockLink: 'What is there',
    notebookParts: ['Components', 'Dishes'],
    titles: {
      cook: 'Cook',
      stock: 'What is there',
      components: 'Components',
      dishes: 'Dishes',
      ratios: 'Ratios',
      settings: 'Settings',
    },
  },
  de: {
    names: ['Kochen', 'Notizbuch', 'Verhältnisse'],
    settings: 'Einstellungen',
    stockLink: 'Vorrat',
    notebookParts: ['Komponenten', 'Gerichte'],
    titles: {
      cook: 'Kochen',
      stock: 'Vorrat',
      components: 'Komponenten',
      dishes: 'Gerichte',
      ratios: 'Verhältnisse',
      settings: 'Einstellungen',
    },
  },
};

const open = async (browser, origin, lang, width, height = 700) => {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: lang,
  });
  await context.addInitScript((l) => {
    try {
      localStorage.setItem('culina.lang', l);
    } catch {
      // about:blank has no storage
    }
  }, lang);
  const problems = watch(context, origin);
  const page = await context.newPage();
  return { context, page, problems };
};
const go = async (page, origin, hash, title) => {
  await page.goto(`${origin}/?no-sw#/${hash}`);
  await page.getByRole('heading', { level: 1, name: title, exact: true }).waitFor();
};
const hashOf = (page) => new URL(page.url()).hash;
/** Opens an address whose heading is not fixed here and waits for its first heading. */
const goAny = async (page, origin, hash) => {
  await page.goto(`${origin}/?no-sw#/${hash}`);
  await page.getByRole('heading', { level: 1 }).first().waitFor();
};

/** The bottom bar as laid out: names in order, one line each, inside the screen, 44 px targets. */
const bar = async (browser, origin, lang, width) => {
  const L = LANGS[lang];
  const label = `${lang} ${width}px`;
  const { context, page, problems } = await open(browser, origin, lang, width);
  for (const [route, title] of [
    ['cook', L.titles.cook],
    ['components', L.titles.components],
    ['ratios', L.titles.ratios],
  ]) {
    await go(page, origin, route, title);
    const links = await page.evaluate(() =>
      [...document.querySelectorAll('.nav-link')]
        .filter((a) => a.getBoundingClientRect().width > 0)
        .map((a) => {
          const text = a.querySelector('.nav-label');
          const box = a.getBoundingClientRect();
          const lineHeight = parseFloat(getComputedStyle(text).lineHeight) || 16;
          return {
            name: text.textContent,
            w: box.width,
            h: box.height,
            left: box.left,
            right: box.right,
            lines: Math.round(text.getBoundingClientRect().height / lineHeight),
            clipped:
              text.scrollWidth > text.clientWidth ||
              text.getBoundingClientRect().right > box.right + 0.5,
            aria: a.getAttribute('aria-label'),
          };
        }),
    );
    check(
      links.map((l) => l.name).join() === L.names.join(),
      `${label} #/${route}: the bar has ${L.names.join(', ')} in that order (${links.map((l) => l.name)})`,
    );
    check(
      links.every((l) => l.lines === 1 && !l.clipped),
      `${label} #/${route}: every label is on one line and not cut off ${JSON.stringify(links.map((l) => [l.name, l.lines, l.clipped]))}`,
    );
    check(
      links.every((l) => l.w >= 44 && l.h >= 44 && l.left >= -0.5 && l.right <= width + 0.5),
      `${label} #/${route}: every entry is a 44 px target inside the screen ${JSON.stringify(links.map((l) => [l.name, Math.round(l.w), Math.round(l.h)]))}`,
    );
    const o = await overflow(page);
    check(o.scroll <= 0, `${label} #/${route}: no horizontal scroll (${o.scroll})`);
  }
  // Only three entries on a phone: Settings is the gear.
  const visible = await page.locator('.nav-link:visible').count();
  check(visible === 3, `${label}: the bar has three entries on a phone (${visible})`);
  check(problems.length === 0, `${label}: no console errors ${problems.join('; ')}`);
  await context.close();
};

/** The gear: in the header at the right, 44 px, named for assistive technology, on every screen. */
const gear = async (browser, origin, lang, width) => {
  const L = LANGS[lang];
  const label = `${lang} ${width}px`;
  const { context, page } = await open(browser, origin, lang, width);
  for (const [route, title] of [
    ['cook', L.titles.cook],
    // The old addresses of the start screen and the classics land on Cook, the one list of dishes.
    ['start', L.titles.cook],
    ['classics', L.titles.cook],
    ['stock', L.titles.stock],
    ['components', L.titles.components],
    ['dishes', L.titles.dishes],
    ['ratios', L.titles.ratios],
    ['settings', L.titles.settings],
  ]) {
    await go(page, origin, route, title);
    const link = page.locator('header .settings-link');
    const box = await link.boundingBox();
    check(
      box !== null &&
        box.width >= 44 &&
        box.height >= 44 &&
        box.x + box.width <= width + 0.5 &&
        box.x > width / 2,
      `${label} #/${route}: the settings gear is in the header, right, at least 44 x 44 (${JSON.stringify(box)})`,
    );
    const name = await link.getAttribute('aria-label');
    check(name === L.settings, `${label} #/${route}: the gear is named "${L.settings}" (${name})`);
    const current = await link.getAttribute('aria-current');
    check(
      (current === 'page') === (route === 'settings'),
      `${label} #/${route}: the gear is marked current only on Settings (${current})`,
    );
  }
  // Keyboard: the gear is the first stop after the skip link, Enter opens Settings.
  await page.goto('about:blank');
  await go(page, origin, 'ratios', L.titles.ratios);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const onGear = await page.evaluate(() => document.activeElement.className);
  check(
    onGear === 'settings-link',
    `${label}: Tab reaches the gear after the skip link (${onGear})`,
  );
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { level: 1, name: L.titles.settings, exact: true }).waitFor();
  check(hashOf(page) === '#/settings', `${label}: Enter on the gear opens Settings`);
  await context.close();
};

/** Parts at the top of the Notebook; Cook is one screen; the old routes keep working and mark their destination. */
const parts = async (browser, origin, lang, width) => {
  const L = LANGS[lang];
  const label = `${lang} ${width}px`;
  const { context, page } = await open(browser, origin, lang, width);
  const current = () =>
    page
      .locator('nav .nav-link[aria-current="page"]:visible')
      .evaluateAll((n) => n.map((x) => x.textContent));
  const tabs = () => page.locator('.section-tabs').first().getByRole('link').allTextContents();
  const marked = () => page.locator('.section-tabs [aria-current="page"]').allTextContents();
  // Cook, and every old address of it, is the one screen: no parts and no views at the top, the
  // way to the stock, the address replaced by #/cook without a new history entry.
  for (const route of ['cook', 'start', 'cook/use-up', 'classics', 'classics/it']) {
    await page.goto('about:blank');
    const before = await page.evaluate(() => history.length);
    await go(page, origin, route, L.titles.cook);
    const added = (await page.evaluate(() => history.length)) - before;
    check(
      hashOf(page) === '#/cook' && added === 1,
      `${label} #/${route}: lands on #/cook, the address replaced, no entry of its own (${hashOf(page)}, ${added} added)`,
    );
    check(
      (await current()).join() === L.names[0],
      `${label} #/${route}: the bar marks ${L.names[0]} (${await current()})`,
    );
    check(
      (await page.locator('.section-tabs, .cook-tab').count()) === 0 &&
        (await page.locator('main a', { hasText: new RegExp(`^${L.stockLink}$`) }).count()) === 1,
      `${label} #/${route}: no parts or views at the top, one way to the stock`,
    );
  }
  await go(page, origin, 'stock', L.titles.stock);
  check(
    (await current()).join() === L.names[0] && (await page.locator('.cook-tab').count()) === 0,
    `${label} #/stock: the stock is its own screen under ${L.names[0]} (${await current()})`,
  );
  // The other addresses of Cook mark Cook; a shipped dish and its cooking mode mark the Notebook,
  // as an own dish does.
  for (const [route, name] of [
    ['cook/not-an-ingredient/with', L.names[0]],
    ['stock/add', L.names[0]],
    ['stock/not-an-item/edit', L.names[0]],
    ['classic/sauerbraten', L.names[1]],
    ['classic/sauerbraten/cook', L.names[1]],
  ]) {
    await goAny(page, origin, route);
    check(
      (await current()).join() === name,
      `${label} #/${route}: the bar marks ${name} (${await current()})`,
    );
  }
  const CASES = [
    ['components', L.titles.components, 'Notebook', L.notebookParts, L.notebookParts[0]],
    ['dishes', L.titles.dishes, 'Notebook', L.notebookParts, L.notebookParts[1]],
  ];
  for (const [route, title, , names, now] of CASES) {
    await go(page, origin, route, title);
    const name = L.names[1];
    check(
      (await current()).join() === name,
      `${label} #/${route}: the bar marks ${name} (${await current()})`,
    );
    check(
      (await tabs()).join() === names.join() && (await marked()).join() === now,
      `${label} #/${route}: the top has ${names.join(' | ')}, the current is ${now} (${await tabs()} / ${await marked()})`,
    );
    const small = await page
      .locator('.section-tab')
      .evaluateAll((n) => n.filter((x) => x.getBoundingClientRect().height < 44).length);
    check(small === 0, `${label} #/${route}: the tabs are at least 44 px high`);
  }
  await context.close();
};

/** Every former destination is reachable from Cook in at most two taps. */
const taps = async (browser, origin, lang) => {
  const L = LANGS[lang];
  const label = `${lang} taps`;
  const { context, page } = await open(browser, origin, lang, 360);
  const nav = (name) => page.locator('nav .nav-link:visible', { hasText: new RegExp(`^${name}$`) });
  const tab = (name) => page.locator('.section-tab', { hasText: new RegExp(`^${name}$`) });
  const stock = () => page.locator('main a', { hasText: new RegExp(`^${L.stockLink}$`) });
  const [cook, notebook, ratios] = L.names;
  const CASES = [
    ['Cook', '#/cook', [() => nav(cook)]],
    ['Ratios', '#/ratios', [() => nav(ratios)]],
    ['Components', '#/components', [() => nav(notebook)]],
    ['Dishes', '#/dishes', [() => nav(notebook), () => tab(L.notebookParts[1])]],
    ['Stock', '#/stock', [stock]],
    ['Settings', '#/settings', [() => page.locator('header .settings-link')]],
  ];
  for (const [name, hash, clicks] of CASES) {
    await go(page, origin, 'cook', L.titles.cook);
    for (const target of clicks) await target().click();
    await page.waitForFunction((h) => location.hash === h, hash);
    check(
      clicks.length <= 2 && hashOf(page) === hash,
      `${label}: ${name} is ${clicks.length} tap(s) from Cook (${hashOf(page)})`,
    );
  }
  // The stock from anywhere: two taps through Cook.
  for (const [route, title] of [
    ['ratios', L.titles.ratios],
    ['dishes', L.titles.dishes],
    ['settings', L.titles.settings],
  ]) {
    await go(page, origin, route, title);
    await nav(cook).click();
    await stock().click();
    await page.waitForFunction(() => location.hash === '#/stock');
    check(true, `${label}: the stock is two taps from #/${route}`);
  }
  await context.close();
};

/** From 720 px: the same three destinations in the side rail, Settings at its bottom, no gear. */
const rail = async (browser, origin, lang) => {
  const L = LANGS[lang];
  const label = `${lang} 1000px`;
  const { context, page } = await open(browser, origin, lang, 1000, 700);
  await go(page, origin, 'cook', L.titles.cook);
  const names = await page.locator('.nav-link:visible .nav-label').allTextContents();
  check(
    names.join() === [...L.names, L.settings].join(),
    `${label}: the rail has ${L.names.join(', ')} and ${L.settings} last (${names})`,
  );
  check(
    (await page.locator('header .settings-link:visible').count()) === 0,
    `${label}: no gear in the header`,
  );
  const last = await page.locator('.nav-link:visible').last().boundingBox();
  const navBox = await page.locator('.app-nav').boundingBox();
  check(
    last !== null && navBox !== null && last.y + last.height > navBox.y + navBox.height - 24,
    `${label}: Settings is at the bottom of the rail (${JSON.stringify([last, navBox])})`,
  );
  await go(page, origin, 'settings', L.titles.settings);
  const marked = await page
    .locator('.nav-link[aria-current="page"]:visible .nav-label')
    .allTextContents();
  check(
    marked.join() === L.settings,
    `${label}: Settings in the rail is marked on its screen (${marked})`,
  );
  await context.close();
};

export const navigation = async (browser, server) => {
  const origin = server.origin;
  for (const lang of ['en', 'de']) {
    for (const width of [320, 360]) {
      await bar(browser, origin, lang, width);
      await gear(browser, origin, lang, width);
      await parts(browser, origin, lang, width);
    }
    await taps(browser, origin, lang);
    await rail(browser, origin, lang);
  }
};
