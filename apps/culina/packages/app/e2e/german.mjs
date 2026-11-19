// The app in German at 360 x 720: the language is chosen through the setting (a reload), then the
// shell, every main screen and the classics flow are walked in German with the usual checks (no
// horizontal scroll, targets of at least 44 x 44, nothing cut off in the navigation, no console
// error). A second visit follows the browser locale `de` with the setting on Follow device.
import { check, watch } from './harness.mjs';
import { brokenWords, overflow, smallTargets } from './measure.mjs';
import { openWith, PAN, TECHNIQUE } from './classics-fixture.mjs';

const ROUTES = {
  start: ['Start', 'Was möchtest du kochen?'],
  classics: ['Start', 'Klassiker nach Land'],
  ratios: ['Verhältnisse', 'Verhältnisse'],
  components: ['Komponenten', 'Komponenten'],
  dishes: ['Gerichte', 'Gerichte'],
  cook: ['Kochen', 'Was kann ich kochen'],
  stock: ['Kochen', 'Vorrat'],
  settings: ['Einstellungen', 'Einstellungen'],
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
    [...document.querySelectorAll('.nav-link')].map((link) => {
      const label = link.querySelector('.nav-label').getBoundingClientRect();
      const box = link.getBoundingClientRect();
      return {
        text: link.getAttribute('aria-label'),
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
    const current = await page.locator('nav [aria-current="page"]').allTextContents();
    check(
      current.length === 1 && current[0].replaceAll('\u00AD', '').trim() === navName,
      `${label} #/${route}: aria-current on ${navName}`,
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
  await openWith(page, origin, 'start');
  await heading(page, 'Was möchtest du kochen?').waitFor();
  await page.getByRole('link', { name: 'Deutschland, 1 Gericht' }).click();
  await heading(page, 'Deutschland').waitFor();
  check(
    (await page.locator('.classic-link').innerText()).includes('Hauptgericht'),
    `${label}: the course is in German`,
  );
  await layout(page, `${label} country`);
  await page.locator('.classic-link').click();
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

export const german = async (browser, server) => {
  const origin = server.origin;

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
  await openWith(b.page, origin, 'start');
  await heading(b.page, 'Was möchtest du kochen?').waitFor();
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
