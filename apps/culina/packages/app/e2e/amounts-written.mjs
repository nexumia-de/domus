// Amounts a cook actually writes, in a browser at 360 px, in English and in German: a component
// with one onion counted in pieces and no piece weight still shows all its lines, its input, its raw
// list and its steps by name, the onion with its own quiet note; the dish that uses it gives the
// same amounts on the dish screen and on its cook screen, with a quiet note that the sauce is not
// weighed; the editor names every unit in the language of the app. The records are written through
// the store's test hook; the onion is a notebook ingredient without a piece weight.
import { check, watch } from './harness.mjs';
import { layout, putStore } from './editor-helpers.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const TEXT = {
  en: {
    tomatoes: 'Tomatoes',
    onion: 'Onion',
    butter: 'Butter',
    salt: 'Salt',
    potato: 'Potato',
    piece: '1 pcs',
    half: '½ pcs (0.69)',
    lacks: 'no piece weight recorded, not in the sums',
    unweighed: 'is not weighed: one run is taken as weighing what goes in',
    units: [
      'g',
      'kg',
      'oz',
      'lb',
      'ml',
      'l',
      'tsp',
      'tbsp',
      'cup',
      'fl oz (UK)',
      'gill (UK)',
      'pint (UK)',
      'quart (UK)',
      'pcs',
    ],
  },
  de: {
    tomatoes: 'Tomaten',
    onion: 'Zwiebel',
    butter: 'Butter',
    salt: 'Salz',
    potato: 'Kartoffel',
    piece: '1 Stück',
    half: '½ Stück (0,69)',
    lacks: 'kein Stückgewicht erfasst, nicht in den Summen',
    unweighed: 'ist nicht gewogen: ein Durchgang zählt so viel, wie hineingeht',
    units: [
      'g',
      'kg',
      'oz',
      'lb',
      'ml',
      'l',
      'TL',
      'EL',
      'Tasse',
      'Flüssigunze (brit.)',
      'Gill (brit.)',
      'Pint (brit.)',
      'Quart (brit.)',
      'Stück',
    ],
  },
};

const ingredient = (id, en, de) => ({ id, name: en, names: { de: { name: de, source: 'e2e' } } });
const ref = (id) => ({ kind: 'ingredient', id });

const seed = async (page) => {
  for (const record of [
    ingredient('e2e-tomatoes', 'Tomatoes', 'Tomaten'),
    ingredient('e2e-onion', 'Onion', 'Zwiebel'),
    ingredient('e2e-butter', 'Butter', 'Butter'),
    ingredient('e2e-salt', 'Salt', 'Salz'),
    ingredient('e2e-potato', 'Potato', 'Kartoffel'),
  ]) {
    await putStore(page, 'ingredients', record);
  }
  await putStore(page, 'components', {
    id: 'e2e-sauce',
    name: 'Tomatensoße schnell',
    version: { family: 'e2e-sauce', date: '2026-11-21' },
    lines: [
      { key: 'tom', ref: ref('e2e-tomatoes'), amount: { value: 400, unit: 'g' } },
      { key: 'oni', ref: ref('e2e-onion'), amount: { value: 1, unit: 'count' } },
      { key: 'but', ref: ref('e2e-butter'), amount: { value: 30, unit: 'g' } },
      { key: 'sal', ref: ref('e2e-salt'), amount: { value: 5, unit: 'g' } },
    ],
    steps: [
      { technique: 'sweat', uses: ['oni', 'but'] },
      { technique: 'simmer', uses: ['tom'] },
      { action: 'season', uses: ['sal'] },
    ],
  });
  await putStore(page, 'dishes', {
    id: 'e2e-plate',
    name: 'Kartoffeln mit Soße',
    portions: 2,
    version: { family: 'e2e-plate', date: '2026-11-21' },
    slots: [
      {
        key: 's1',
        role: 'sauce',
        ref: { kind: 'component', id: 'e2e-sauce' },
        amount: { value: 150, unit: 'g' },
      },
      { key: 's2', role: 'main', ref: ref('e2e-potato'), amount: { value: 250, unit: 'g' } },
    ],
  });
};

const visit = async (page, origin, hash, name) => {
  await page.goto('about:blank');
  await page.goto(`${origin}/?no-sw&e2e-store#/${hash}`);
  await page.getByRole('heading', { level: 1, name }).waitFor();
};

const cells = (page, selector) =>
  page.evaluate(
    (s) =>
      [...document.querySelectorAll(`${s} tbody tr`)].map((tr) =>
        [...tr.children].map((c) => c.innerText.trim()),
      ),
    selector,
  );

const run = async (browser, origin, lang) => {
  const t = TEXT[lang];
  const label = `360px ${lang} amounts as written`;
  const context = await browser.newContext({ viewport: { width: 360, height: 720 }, locale: lang });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await visit(page, origin, 'components', undefined);
  await seed(page);

  // A: the component screen.
  await visit(page, origin, 'components/e2e-sauce', 'Tomatensoße schnell');
  const lines = await cells(page, '.lines-table');
  check(
    same(
      lines.map((r) => [r[0].split('\n')[0], r[1]]),
      [
        [t.tomatoes, '400 g'],
        [t.onion, t.piece],
        [t.butter, '30 g'],
        [t.salt, '5 g'],
      ],
    ) && lines[1][0].includes(t.lacks),
    `${label}: every line shows, the onion as written with its own note (${JSON.stringify(lines)})`,
  );
  check(
    (await page.locator('section.yield .figures').innerText()).includes('435 g'),
    `${label}: the yield shows the input of the lines that can be weighed`,
  );
  const raw = await cells(page, '.raw-section .raw-table');
  check(
    same(raw.at(-1), [lang === 'de' ? 'Gesamt' : 'Total', '435 g']) &&
      (await page.locator('.raw-section .raw-extra').innerText()).includes(t.onion),
    `${label}: the raw list adds up the rest and lists the onion apart`,
  );
  const steps = await page.locator('.steps-section .recipe-steps li').allInnerTexts();
  check(
    steps.length === 3 &&
      steps[0].endsWith(`: ${t.onion}, ${t.butter}`) &&
      steps[1].endsWith(`: ${t.tomatoes}`) &&
      steps.every((s) => !s.includes('e2e-')),
    `${label}: the steps name their lines, never an id (${steps.join(' | ')})`,
  );
  await layout(page, `${label} (component)`);

  await page.locator('.steps-section a.btn.primary').click();
  await page.locator('.cook-step').waitFor();
  check(
    same(await page.locator('.cook-step .recipe-name').allInnerTexts(), [t.onion, t.butter]) &&
      same(await page.locator('.cook-step .recipe-amount').allInnerTexts(), [t.piece, '30 g']),
    `${label}: the cook screen names what is needed with its amounts`,
  );
  await layout(page, `${label} (cook a component)`);

  // B: the dish and its cook screen give the same amounts.
  await visit(page, origin, 'dishes/e2e-plate', 'Kartoffeln mit Soße');
  const total = await cells(page, '.raw-table');
  check(
    same(total, [
      [t.tomatoes, '276 g'],
      [t.butter, '21 g'],
      [t.salt, lang === 'de' ? '3,4 g' : '3.4 g'],
      [t.potato, '500 g'],
      [lang === 'de' ? 'Gesamt' : 'Total', '800 g'],
    ]),
    `${label}: the dish adds up the unweighed sauce as what goes into it (${JSON.stringify(total)})`,
  );
  check(
    (await page.locator('.raw .note-quiet').allInnerTexts()).some((n) => n.includes(t.unweighed)),
    `${label}: with a quiet note that the sauce is not weighed`,
  );
  await layout(page, `${label} (dish)`);
  await page
    .getByRole('link', { name: lang === 'de' ? 'Schritt für Schritt kochen' : 'Cook step by step' })
    .click();
  await page.locator('.cook-step').waitFor();
  check(
    same(await page.locator('.cook-step .recipe-amount').allInnerTexts(), [t.half, '21 g']),
    `${label}: the dish's cook screen scales the sauce by the same rule`,
  );
  await layout(page, `${label} (cook the dish)`);

  // D: the editor names every unit.
  await visit(page, origin, 'components/e2e-sauce/edit', undefined);
  await page.locator('.line-edit select').first().waitFor();
  const options = await page.locator('.line-edit select').first().locator('option').allInnerTexts();
  check(
    same(options, t.units),
    `${label}: the unit select names every unit (${options.join(', ')})`,
  );
  await layout(page, `${label} (editor)`);

  check(
    problems.length === 0,
    `${label}: no console errors or foreign requests ${problems.join('; ')}`,
  );
  await context.close();
};

export const amountsWritten = async (browser, server) => {
  await run(browser, server.origin, 'en');
  await run(browser, server.origin, 'de');
};
