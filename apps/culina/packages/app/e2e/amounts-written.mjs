// Amounts a cook actually writes, in a browser at 360 px, in English and in German: a component
// with one onion counted in pieces and no piece weight still shows all its lines, its input, its raw
// list and its steps by name, the onion with its own quiet note; the dish that uses it by weight
// cannot scale it (its run cannot be weighed without the onion, since 2026-11-24; before, the run
// was weighed without it and the sauce came out too large without a word), so the dish screen and
// its cook screen show the sauce as written, one run, with a quiet line that says why, and the
// total list does not add it up and says why; the editor names every unit in the language of the
// app. The records are written through
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
    cannotScale: 'cannot be scaled: Onion has no weight here.',
    asWritten: 'For one run as written.',
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
    cannotScale: 'lässt sich nicht skalieren: Zwiebel hat hier kein Gewicht.',
    asWritten: 'Für einen Ansatz wie notiert.',
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

  // B: the dish cannot scale the sauce (the onion cannot be weighed), and says so everywhere.
  await visit(page, origin, 'dishes/e2e-plate', 'Kartoffeln mit Soße');
  const total = await cells(page, '.raw-table');
  check(
    same(total, [
      [t.potato, '500 g'],
      [lang === 'de' ? 'Gesamt' : 'Total', '500 g'],
    ]),
    `${label}: the dish does not add up the sauce it cannot weigh (${JSON.stringify(total)})`,
  );
  check(
    (await page.locator('.raw li').allInnerTexts()).some((n) => n.includes(t.cannotScale)),
    `${label}: under "Not added up" it says the sauce cannot be scaled`,
  );
  const partNote = await page.locator('.recipe-block .part-note').allInnerTexts();
  check(
    partNote.length === 1 &&
      partNote[0].includes(t.cannotScale) &&
      partNote[0].endsWith(t.asWritten),
    `${label}: the sauce in the ingredients is one run as written, and says why (${partNote.join(' | ')})`,
  );
  await layout(page, `${label} (dish)`);
  await page
    .getByRole('link', { name: lang === 'de' ? 'Schritt für Schritt kochen' : 'Cook step by step' })
    .click();
  await page.locator('.cook-step').waitFor();
  check(
    same(await page.locator('.cook-step .recipe-amount').allInnerTexts(), [t.piece, '30 g']),
    `${label}: the dish's cook screen shows the sauce as written, not scaled`,
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

// The kept green beans in butter: their boiled beans cannot be scaled (the run holds the boiling
// water, which a run is not weighed by), so the cook screen shows them as written, one run, and
// says why at the step where the amounts are read, also cooked at 4 portions where the copy was
// kept for 2 (docs/dish-characters.md). Control: the step of the other part has no such note.
const BEANS = {
  en: {
    cook: 'Cook step by step',
    note: 'The output of Boiled green beans is not weighed yet, so it cannot be scaled. For one run as written.',
  },
  de: {
    cook: 'Schritt für Schritt kochen',
    note: 'Das Ergebnis von Gekochte grüne Bohnen ist noch nicht gewogen, deshalb lässt es sich nicht skalieren. Für einen Ansatz wie notiert.',
  },
};

const keptBeans = async (browser, origin, lang) => {
  const t = BEANS[lang];
  const label = `360px ${lang} kept green beans at 4 portions`;
  const context = await browser.newContext({ viewport: { width: 360, height: 720 }, locale: lang });
  const problems = watch(context, origin);
  const page = await context.newPage();
  await visit(page, origin, 'classic/haricots-verts-beurre', undefined);
  await page.locator('.classic-copy .keep-button').click();
  await page.waitForURL(/#\/dishes\//);
  await page.locator('.dish-card .version-lines').waitFor();
  await page.getByLabel(lang === 'de' ? 'Portionen' : 'Portions', { exact: true }).fill('4');
  await page.getByRole('link', { name: t.cook }).click();
  await page.locator('.cook-step').waitFor();
  const amounts = await page.locator('.cook-step .recipe-amount').allInnerTexts();
  const note = await page.locator('.cook-step .part-note').allInnerTexts();
  check(
    note.length === 1 && note[0] === t.note && same(amounts, ['250 g']),
    `${label}: step 1 shows the boiled beans as written, one run, and says why (${note.join(' | ')})`,
  );
  await layout(page, label);
  // Through the boiled beans' steps to the next part, whose step has no such note.
  for (let i = 0; i < 12; i++) {
    const from = await page
      .locator('.cook-step .muted')
      .first()
      .innerText()
      .catch(() => '');
    if (!from.includes(lang === 'de' ? 'Gekochte' : 'Boiled')) break;
    await page.locator('.cook-next').click();
  }
  check(
    (await page.locator('.cook-step .part-note').count()) === 0,
    `${label}: the step of the other part has no such note (the control)`,
  );
  check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
  await context.close();
};

export const amountsWritten = async (browser, server) => {
  await run(browser, server.origin, 'en');
  await run(browser, server.origin, 'de');
  await keptBeans(browser, server.origin, 'en');
  await keptBeans(browser, server.origin, 'de');
};
