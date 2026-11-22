// The shipped components in the Components list (issue 44, point 4), on the real shipped content
// (dist/classics.json, no fixture): every component of every shipped dish is listed and marked,
// the origin choice and the search narrow the list, a shipped component opens read-only with the
// amounts of its dish screen, Keep makes own records, and a component with an ingredient the
// catalogue lacks says why it cannot be kept. At 360 px (English and German) and 1000 px.
import { readFileSync } from 'node:fs';
import { listStore } from './editor-helpers.mjs';
import { check, distDir, watch } from './harness.mjs';
import { overflow, smallTargets } from './measure.mjs';

const content = JSON.parse(readFileSync(`${distDir}classics.json`, 'utf8'));
const TOTAL = content.classics.reduce((n, c) => n + (c.components ?? []).length, 0);
// Snow eggs: a component whose line names another (the custard), with no wanted line.
const DISH = 'oeufs-a-la-neige';
const KEEPABLE = `${DISH}.snow-eggs`;
// Saffron risotto still names water as a wanted ingredient.
const WANTED = 'risotto-alla-milanese.saffron-risotto';

const open = async (page, origin, hash) => {
  await page.goto('about:blank');
  await page.goto(`${origin}/?no-sw&e2e-store#/${hash}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
};
const texts = (page, selector) => page.locator(selector).allTextContents();
const shippedRows = '.component-row-shipped';

const phone = async (browser, origin) => {
  const label = '360px shipped components';
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();

  await open(page, origin, 'components');
  await page.locator(shippedRows).first().waitFor();
  const metas = await texts(page, `${shippedRows} .entry-meta`);
  check(
    TOTAL > 0 && metas.length === TOTAL,
    `${label}: every component of the shipped dishes is listed (${metas.length} of ${TOTAL})`,
  );
  check(
    metas.every((m) => m.split(' · ').includes('Shipped')),
    `${label}: each shipped row is marked "Shipped" and names its dish (${metas[0]})`,
  );
  check(
    (await texts(page, '.component-group-heading')).join('|') ===
      'In my notebook|Shipped with the app',
    `${label}: two groups, the notebook's first`,
  );
  check(
    (await page.getByRole('button', { name: 'Add example data' }).count()) === 1,
    `${label}: an empty notebook still offers its example data above the shipped ones`,
  );
  let small = await smallTargets(page);
  check(small.length === 0, `${label}: list targets at least 44 x 44 ${small.join('; ')}`);
  let o = await overflow(page);
  check(o.scroll <= 0 && o.wide.length === 0, `${label}: the list fits ${JSON.stringify(o)}`);

  const from = page.getByLabel('From');
  await from.selectOption('shipped');
  check(
    (await page.locator('.component-group-heading').count()) === 0 &&
      (await page.locator(shippedRows).count()) === TOTAL &&
      (await page.getByRole('button', { name: 'Add example data' }).count()) === 0,
    `${label}: "Shipped" leaves the notebook's group out`,
  );
  await from.selectOption('own');
  check(
    (await page.locator(shippedRows).count()) === 0,
    `${label}: "Mine" leaves the shipped ones out`,
  );
  await from.selectOption('');

  const dishName = content.classics.find((c) => c.id === DISH).name.en;
  await page.getByLabel('Search by name').fill(dishName.slice(0, 12).toUpperCase());
  check(
    (await texts(page, `${shippedRows} .entry-name`)).join('|') === 'Snow eggs|Custard',
    `${label}: the search finds the components of a dish by the dish's name`,
  );
  await page.locator(shippedRows, { hasText: 'Snow eggs' }).first().click();
  await page.getByRole('heading', { level: 1, name: 'Snow eggs' }).waitFor();
  check(page.url().endsWith(`#/components/${KEEPABLE}`), `${label}: the row opens ${KEEPABLE}`);
  check(
    (await page.getByRole('button', { name: /^(Edit|Delete|Make a variation)$/ }).count()) === 0 &&
      (await page.getByRole('link', { name: /^(Edit|History|Cook step by step)$/ }).count()) ===
        0 &&
      (await page.locator('.version-line, .version-section').count()) === 0,
    `${label}: read-only: no edit, no history, no versions`,
  );
  check(
    (await page.locator('.shipped-component-card').innerText()).includes('Shipped with the app') &&
      (await page.getByRole('link', { name: `Part of ${dishName}` }).getAttribute('href')) ===
        `#/classic/${DISH}`,
    `${label}: says it is shipped and links its dish`,
  );
  check(
    (await page.locator('.line-link').getAttribute('href')) === `#/components/${DISH}.custard`,
    `${label}: the line that names the custard opens the shipped custard`,
  );
  check(
    (await page.locator('.source-block summary').innerText()) === 'Source',
    `${label}: the source is at the foot, closed`,
  );
  const amounts = await texts(page, '.shipped-component-card .recipe-lines .recipe-amount');
  small = await smallTargets(page);
  check(small.length === 0, `${label}: detail targets at least 44 x 44 ${small.join('; ')}`);
  o = await overflow(page);
  check(o.scroll <= 0 && o.wide.length === 0, `${label}: the detail fits ${JSON.stringify(o)}`);

  // The same amounts as the dish screen shows for the same portions (2 on both).
  await open(page, origin, `classic/${DISH}`);
  const onDish = await texts(page, 'ul.recipe-lines[aria-label="Snow eggs"] .recipe-amount');
  check(
    amounts.length > 0 && JSON.stringify(amounts) === JSON.stringify(onDish),
    `${label}: the amounts are those of the dish screen (${amounts.join(', ')})`,
  );

  await open(page, origin, `components/${KEEPABLE}`);
  await page.getByRole('button', { name: 'Keep in my notebook' }).click();
  await page.waitForURL(/#\/components\/u-/);
  await page.getByRole('heading', { level: 1, name: 'Snow eggs' }).waitFor();
  const kept = await listStore(page, 'components');
  check(
    kept.length === 2 &&
      kept.every((c) => c.id.startsWith('u-') && c['x-origin']?.classic === DISH) &&
      kept
        .map((c) => c.name)
        .sort()
        .join('|') === 'Custard|Snow eggs',
    `${label}: Keep writes the component and the custard it names as own records (${kept.length})`,
  );
  check(
    (await page.getByRole('link', { name: 'Edit', exact: true }).count()) === 1,
    `${label}: Keep opens the own copy, which can be edited`,
  );

  await open(page, origin, `components/${WANTED}`);
  check(
    (await page.getByRole('button', { name: 'Keep in my notebook' }).count()) === 0 &&
      (await page.locator('.keep-cannot').innerText()).includes('does not know Water'),
    `${label}: a component with an ingredient the catalogue lacks says why it cannot be kept`,
  );
  await open(page, origin, 'components/no-such-dish.nothing');
  check(
    (await page.getByText('That component is not in the notebook.').count()) === 1,
    `${label}: an unknown shipped key shows the list with a quiet line`,
  );
  check(
    problems.length === 0,
    `${label}: no console errors, CSP violations or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
};

const desk = async (browser, origin) => {
  const label = '1000px shipped components';
  const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  const page = await context.newPage();
  await open(page, origin, `components/${KEEPABLE}`);
  check(
    (await page.locator('[aria-current="page"].component-row-shipped .entry-name').innerText()) ===
      'Snow eggs',
    `${label}: the list stands beside the shipped component, its row marked`,
  );
  const o = await overflow(page);
  check(o.scroll <= 0 && o.wide.length === 0, `${label}: fits ${JSON.stringify(o)}`);
  await context.close();
};

const german = async (browser, origin) => {
  const label = 'de 360px shipped components';
  const context = await browser.newContext({ viewport: { width: 360, height: 720 }, locale: 'de' });
  const page = await context.newPage();
  await open(page, origin, 'components');
  await page.locator(shippedRows).first().waitFor();
  const metas = await texts(page, `${shippedRows} .entry-meta`);
  check(
    metas.length === TOTAL && metas.every((m) => m.split(' · ').includes('Mitgeliefert')),
    `${label}: each shipped row is marked "Mitgeliefert" (${metas[0]})`,
  );
  await open(page, origin, `components/${KEEPABLE}`);
  check(
    (await page.getByRole('button', { name: 'In mein Notizbuch übernehmen' }).count()) === 1 &&
      (await page.locator('.shipped-component-card').innerText()).includes('Mit der App geliefert'),
    `${label}: the detail speaks German`,
  );
  await open(page, origin, `components/${WANTED}`);
  const cannot = await page.locator('.keep-cannot').innerText();
  check(
    (await page.getByRole('button', { name: 'In mein Notizbuch übernehmen' }).count()) === 0 &&
      cannot ===
        'Diese Komponente lässt sich noch nicht übernehmen: Das Notizbuch kennt Wasser nicht. Das Rezept bleibt hier zum Kochen.',
    `${label}: why a component cannot be kept, in German with the German name (${cannot})`,
  );
  await context.close();
};

export const componentsShipped = async (browser, server) => {
  await phone(browser, server.origin);
  await desk(browser, server.origin);
  await german(browser, server.origin);
};
