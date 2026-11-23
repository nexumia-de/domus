// The app in German at 360 x 720: the language is chosen through the setting (a reload), then the
// shell, every main screen and the classics flow are walked in German with the usual checks (no
// horizontal scroll, targets of at least 44 x 44, nothing cut off in the navigation, no console
// error). A second visit follows the browser locale `de` with the setting on Follow device.
import { check, watch } from './harness.mjs';
import { brokenWords, overflow, smallTargets } from './measure.mjs';
import { openWith, PAN, TECHNIQUE } from './classics-fixture.mjs';

const ROUTES = {
  // The old addresses of Start and the classics land on Cook, the one list of dishes.
  start: ['Kochen', 'Kochen'],
  classics: ['Kochen', 'Kochen'],
  ratios: ['Verhältnisse', 'Verhältnisse'],
  components: ['Notizbuch', 'Komponenten'],
  dishes: ['Notizbuch', 'Gerichte'],
  cook: ['Kochen', 'Kochen'],
  stock: ['Kochen', 'Vorrat'],
  // Settings is the gear in the header on a phone: no entry of the bar is marked.
  settings: [undefined, 'Einstellungen'],
};
const heading = (page, name) => page.getByRole('heading', { level: 1, name, exact: true });
const step = (page, n, total) =>
  page.getByRole('heading', { level: 2, name: `Schritt ${n} von ${total}` });

const layout = async (page, label) => {
  const o = await overflow(page);
  check(o.scroll <= 0 && o.wide.length === 0, `${label}: no horizontal scroll ${o.wide.join(',')}`);
  const small = await smallTargets(page);
  check(small.length === 0, `${label}: targets at least 44 x 44 ${small.join('; ')}`);
  const nav = await page.evaluate(() =>
    [...document.querySelectorAll('.nav-link')]
      .filter((link) => link.getBoundingClientRect().width > 0)
      .map((link) => {
        const label = link.querySelector('.nav-label').getBoundingClientRect();
        const box = link.getBoundingClientRect();
        return {
          text: link.textContent,
          cut: label.left < box.left - 1 || label.right > box.right + 1,
        };
      }),
  );
  check(
    nav.every((n) => !n.cut),
    `${label}: every navigation label stays inside its entry ${nav.filter((n) => n.cut).map((n) => n.text)}`,
  );
};

const fresh = async (browser, origin, options = {}) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 }, ...options });
  const problems = watch(context, origin);
  const page = await context.newPage();
  return { context, page, problems };
};

const walk = async (page, origin, label) => {
  for (const [route, [navName, title]] of Object.entries(ROUTES)) {
    await openWith(page, origin, route);
    await heading(page, title).waitFor();
    const current = await page
      .locator('nav .nav-link[aria-current="page"]:visible')
      .allTextContents();
    check(
      navName === undefined
        ? current.length === 0 &&
            (await page.locator('header .settings-link').getAttribute('aria-current')) === 'page'
        : current.length === 1 && current[0].trim() === navName,
      `${label} #/${route}: aria-current on ${navName ?? 'the settings gear'}`,
    );
    await layout(page, `${label} #/${route}`);
  }
};

/** The ratios in German: names, role words, table columns, compare labels, source line: no English left. */
const ratiosGerman = async (page, origin, label) => {
  await openWith(page, origin, 'ratios');
  await heading(page, 'Verhältnisse').waitFor();
  const list = await page.locator('.ratio-list').innerText();
  check(
    list.includes('Brotteig, Verhältnis') &&
      list.includes('Mehl : Fett : Wasser') &&
      !/\b(flour|water|fat|dough|bread|egg|sugar)\b/i.test(list),
    `${label}: the ratio list has German names and German role words`,
  );
  await openWith(page, origin, 'ratios/pie-dough');
  await heading(page, 'Pie-Teig').waitFor();
  const heads = await page.locator('.parts thead th').allTextContents();
  const roles = await page.locator('.parts tbody th').allTextContents();
  check(
    heads.join('|') === 'Zutat|Teile|% von Mehl' && roles.join('|') === 'Mehl|Fett|Wasser',
    `${label}: table columns and roles are German (${heads.join('|')} / ${roles.join('|')})`,
  );
  check(
    (await page.locator('.source').innerText()) === 'Quelle: Michael Ruhlman, Ratio, S. 17',
    `${label}: the source is author, title and page, not a repository path`,
  );
  await page.locator('.calc input.field').fill('500,5');
  await page.getByText('Meine Mengen vergleichen').click();
  await page.getByLabel('Mehl (g)').fill('500');
  const card = await page.locator('main').innerText();
  check(
    !/\b(flour|water|fat)\b/i.test(card) && !card.includes('docs/'),
    `${label}: the card, the calculator and the comparison have no English role word and no path`,
  );
  const options = await page.locator('.calc select').first().locator('option').allTextContents();
  check(options.join('|') === 'Mehl|Fett|Wasser', `${label}: the calculator offers German roles`);
};

/** At 320 and 360 px the amounts in the dish, component and dish-of-the-notebook views never break inside a word. */
const narrow = async (browser, origin) => {
  for (const width of [320, 360]) {
    const label = `German ${width}px`;
    const context = await browser.newContext({ viewport: { width, height: 700 }, locale: 'de' });
    await context.addInitScript(() => localStorage.setItem('culina.lang', 'de'));
    const page = await context.newPage();
    await page.goto(`${origin}/?no-sw#/settings`);
    await page.getByRole('button', { name: 'Beispieldaten hinzufügen' }).click();
    await page.getByText('Beispieleinträge wurden deinem Notizbuch hinzugefügt.').waitFor();
    for (const [hash, title] of [
      ['components/example-pan-sauce', 'Beispiel: Pfannensoße mit Brühe als Grundlage'],
      ['components/example-flat-dough', 'Beispiel: Fladenteig'],
      ['dishes/example-flat-dough-with-sauce', 'Beispiel: Fladen mit Pfannensoße'],
      ['classic/sauerbraten', 'Sauerbraten'],
    ]) {
      await page.goto(`${origin}/?no-sw#/${hash}`);
      await heading(page, title).waitFor();
      const broken = await brokenWords(page, 'td.num, th.num, .recipe-amount');
      check(broken.length === 0, `${label} #/${hash}: no amount breaks inside a word ${broken}`);
      const o = await overflow(page);
      check(o.scroll <= 0, `${label} #/${hash}: no horizontal scroll ${o.wide.join(',')}`);
    }
    await context.close();
  }
};

const classicsFlow = async (page, origin, label) => {
  await openWith(page, origin, 'cook');
  await heading(page, 'Kochen').waitFor();
  await page.locator('.dish-row-shipped').first().waitFor();
  check(
    (await page.locator('.dish-row-shipped').count()) === 2,
    `${label}: Cook lists the shipped dishes`,
  );
  check(
    (await page.getByLabel('Nur mit dem, was da ist').count()) === 1 &&
      (
        await page.getByLabel('Reihenfolge', { exact: true }).locator('option').allInnerTexts()
      ).join('|') === 'Nach Name|Zuerst verbrauchen' &&
      (await page.getByRole('link', { name: 'Vorrat', exact: true }).count()) === 1,
    `${label}: the switch, the order and the way to the stock are in German`,
  );
  await page.getByLabel('Reihenfolge', { exact: true }).selectOption('use-up');
  await page.getByLabel('Nur mit dem, was da ist').check();
  const judged = [
    (await page.locator('.dish-list').innerText()) +
      (await page.locator('.cook-list-note').innerText()),
  ];
  await page.getByLabel('Nur mit dem, was da ist').uncheck();
  judged.push(
    (await page.locator('.dish-list').innerText()) +
      (await page.locator('.cook-list-note').innerText()),
  );
  check(
    judged.every((text) => !/wrong|too much|falsch|zu viel|error/i.test(text)),
    `${label}: Cook's rows and notes do not judge (falsch, zu viel)`,
  );
  await page.getByLabel('Reihenfolge', { exact: true }).selectOption('name');
  await layout(page, `${label} cook`);
  await openWith(page, origin, 'classics/de');
  await heading(page, 'Kochen').waitFor();
  await page.locator('.dish-row').first().waitFor();
  const row = await page.locator('.dish-row').innerText();
  check(
    row.includes('Hauptgericht') && row.includes('Deutsche Küche') && !row.includes('Deutschland'),
    `${label}: the course and the cuisine are in German (${row})`,
  );
  await layout(page, `${label} country`);
  await page.locator('.dish-row').click();
  await heading(page, PAN.name.de).waitFor();
  check(
    await page.getByRole('link', { name: 'Schritt für Schritt kochen' }).isVisible(),
    `${label}: the dish view has its German button`,
  );
  check(
    (await page.getByLabel('Portionen', { exact: true }).inputValue()) === '2',
    `${label}: Portionen default to 2`,
  );
  const text = await page.locator('.classic-card').innerText();
  check(!/\d\.\d/.test(text), `${label}: no decimal point in the dish view`);
  check(
    await page
      .getByRole('heading', { name: 'Nährwerte pro Portion' })
      .count()
      .then((n) => n <= 1),
    `${label}: the nutrition heading is German when it shows`,
  );
  await layout(page, `${label} dish`);
  await page.getByRole('link', { name: 'Schritt für Schritt kochen' }).click();
  await step(page, 1, 3).waitFor();
  check(
    await page.getByRole('heading', { name: `Technik: ${TECHNIQUE.name.de}` }).isVisible(),
    `${label}: the technique note is German`,
  );
  await layout(page, `${label} step 1`);
  await page.getByRole('button', { name: 'Weiter' }).click();
  await step(page, 2, 3).waitFor();
  await layout(page, `${label} step 2`);
  await page.getByRole('button', { name: 'Zurück' }).click();
  await step(page, 1, 3).waitFor();
  await page.locator('.technique-note').getByRole('button', { name: 'Das kenne ich' }).click();
  await page.getByText(`Als gelernt markiert: ${TECHNIQUE.name.de}.`).waitFor();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await step(page, 3, 3).waitFor();
  check(
    await page.getByText('Zeit: 1,5 bis 2,5 Std.').isVisible(),
    `${label}: a range of hours has the German decimal comma (1,5 bis 2,5 Std.)`,
  );
  check(
    !/\d\.\d/.test(await page.locator('.cook-steps').innerText()),
    `${label}: no decimal point in cooking mode`,
  );
  const nextBox = await page.getByRole('button', { name: 'Fertig' }).boundingBox();
  const navBox = await page.locator('.app-nav').boundingBox();
  check(
    nextBox !== null && navBox !== null && nextBox.y + nextBox.height <= navBox.y + 1,
    `${label}: Fertig sits above the navigation, which is taller with two-line labels`,
  );
  await page.getByRole('button', { name: 'Fertig' }).click();
  await page.getByRole('heading', { level: 2, name: 'Fertig gekocht' }).waitFor();
  await layout(page, `${label} done`);
  check(
    (await page.getByRole('button', { name: 'In mein Notizbuch übernehmen' }).count()) === 1,
    `${label}: the end of cooking offers the notebook`,
  );
};

/**
 * Places a careful German reader corrected (docs/german-review.md), on the real shipped content:
 * a source line without the transcriber's file and with German abbreviations, each technique
 * source once, the omelette as "das Omelett", a German date, and the heading after a change of
 * screen without a ring after a tap but with one after a key.
 */
const readerFixes = async (browser, origin) => {
  const label = 'German reading';
  const { context, page, problems } = await fresh(browser, origin, { locale: 'de' });
  await page.goto(`${origin}/?no-sw#/classic/omelette-fines-herbes`);
  await heading(page, 'Kräuteromelett').waitFor();
  const steps = await page.locator('main').innerText();
  check(
    steps.includes('Das Omelett von beiden Rändern her zur Mitte einschlagen') &&
      !steps.includes('die Omelette'),
    `${label}: the omelette is "das Omelett" in every step`,
  );
  await page.locator('.source-block summary').click();
  const source = await page.locator('.source-block').innerText();
  check(
    !source.includes('.txt') && source.includes('S. 273-274') && !source.includes('pp.'),
    `${label}: the place has German page words and no transcript file (${source.slice(0, 200)})`,
  );
  check(
    (source.match(/1877/g) ?? []).length === 1 && source.includes('4. Aufl.'),
    `${label}: the year stands once and the edition is "4. Aufl."`,
  );
  await layout(page, `${label} omelette`);

  await page.goto(`${origin}/?no-sw#/classic/pot-au-feu`);
  await heading(page, 'Pot-au-feu (kleiner Topf)').waitFor();
  await page.getByRole('link', { name: 'Schritt für Schritt kochen' }).click();
  await step(page, 1, 20).waitFor();
  for (let n = 2; n <= 4; n += 1) {
    await page.getByRole('button', { name: 'Weiter' }).click();
    await step(page, n, 20).waitFor();
  }
  await page.locator('.technique-more summary').click();
  const items = await page.locator('.technique-sources li').allInnerTexts();
  check(
    new Set(items).size === items.length &&
      items.some((t) => t.includes('38. Aufl.')) &&
      items.every((t) => !/\b(pp?|chapter|section)\b\.?\s/.test(t)),
    `${label}: each technique source once, with German citation words (${items.join(' / ')})`,
  );
  await layout(page, `${label} technique note`);

  // A heading focused after a tap has no ring; after a key it has one.
  await page.goto(`${origin}/?no-sw#/ratios`);
  await heading(page, 'Verhältnisse').waitFor();
  await page.locator('nav .nav-link:visible', { hasText: 'Kochen' }).click();
  await heading(page, 'Kochen').waitFor();
  const ring = () =>
    page.evaluate(() => {
      const h = document.querySelector('main h1');
      return document.activeElement === h ? getComputedStyle(h).outlineStyle : 'not focused';
    });
  check((await ring()) === 'none', `${label}: after a tap the focused heading shows no ring`);
  await page.locator('nav .nav-link:visible', { hasText: 'Verhältnisse' }).focus();
  await page.keyboard.press('Enter');
  await heading(page, 'Verhältnisse').waitFor();
  const keyRing = await ring();
  check(
    keyRing !== 'none' && keyRing !== 'not focused',
    `${label}: after a key the focused heading shows its ring (${keyRing})`,
  );

  // Dates in the German form.
  await page.goto(`${origin}/?no-sw#/settings`);
  await page.getByRole('button', { name: 'Beispieldaten hinzufügen' }).click();
  await page.getByText('Beispieleinträge wurden deinem Notizbuch hinzugefügt.').waitFor();
  await page.goto(`${origin}/?no-sw#/components/example-pan-sauce`);
  await heading(page, 'Beispiel: Pfannensoße mit Brühe als Grundlage').waitFor();
  const version = await page.locator('.version-line').innerText();
  check(
    /^Version 1 · \d{2}\.\d{2}\.\d{4}$/.test(version.trim()),
    `${label}: the version line has the German date (${version})`,
  );
  check(problems.length === 0, `${label}: no console errors ${problems.join('; ')}`);
  await context.close();
};

export const german = async (browser, server) => {
  const origin = server.origin;
  await readerFixes(browser, origin);

  // Chosen through the setting: the choice is kept and the app reloads in German.
  const a = await fresh(browser, origin);
  await openWith(a.page, origin, 'settings');
  await heading(a.page, 'Settings').waitFor();
  check(
    (await a.page.locator('html').getAttribute('lang')) === 'en',
    'German: lang is en by default',
  );
  await a.page.getByLabel('Deutsch').click();
  await a.page.waitForFunction(() => document.documentElement.lang === 'de');
  await heading(a.page, 'Einstellungen').waitFor();
  check(
    (await a.page.evaluate(() => localStorage.getItem('culina.lang'))) === 'de',
    'German: the choice is kept like the theme',
  );
  check(
    (await a.page.title()).includes("Cook's Notebook") &&
      (await a.page.getByRole('radio', { name: 'Deutsch' }).isChecked()),
    'German: the radio shows the kept choice',
  );
  await walk(a.page, origin, 'German');
  await narrow(browser, origin);
  await ratiosGerman(a.page, origin, 'German');
  await classicsFlow(a.page, origin, 'German');
  await openWith(a.page, origin, 'settings');
  await a.page.getByLabel('English').click();
  await a.page.waitForFunction(() => document.documentElement.lang === 'en');
  await heading(a.page, 'Settings').waitFor();
  check(true, 'German: choosing English brings the English texts back');
  check(a.problems.length === 0, `German: no console errors ${a.problems.join('; ')}`);
  await a.context.close();

  // Follow device with the browser locale de.
  const b = await fresh(browser, origin, { locale: 'de' });
  await openWith(b.page, origin, 'cook');
  await heading(b.page, 'Kochen').waitFor();
  check(
    (await b.page.locator('html').getAttribute('lang')) === 'de',
    'German device: lang follows the browser locale',
  );
  await openWith(b.page, origin, 'settings');
  check(
    await b.page.getByRole('radio', { name: 'Wie das Gerät' }).isChecked(),
    'German device: the setting is on Follow device',
  );
  await walk(b.page, origin, 'German device');
  await classicsFlow(b.page, origin, 'German device');
  check(b.problems.length === 0, `German device: no console errors ${b.problems.join('; ')}`);
  await b.context.close();
};
