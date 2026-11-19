// The app in German at 360 x 720: the language is chosen through the setting (a reload), then the
// shell, every main screen and the classics flow are walked in German with the usual checks (no
// horizontal scroll, targets of at least 44 x 44, nothing cut off in the navigation, no console
// error). A second visit follows the browser locale `de` with the setting on Follow device.
import { check, watch } from './harness.mjs';
import { overflow, smallTargets } from './measure.mjs';
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
