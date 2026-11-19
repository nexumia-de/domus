// The classics in a browser, on the fictional example dishes: start -> country -> dish -> step by
// step -> mark a skill as learned -> the note is gone on the next dish -> Settings "Teach again" ->
// keep in the notebook. At 360 x 720 and at desktop size: no horizontal scroll, targets of at least
// 44 x 44, no console error, nothing focused when a screen opens, focus moves on a step change.
import { check, watch } from './harness.mjs';
import { overflow, smallTargets } from './measure.mjs';
import { engineGrams, openWith, PAN, SECOND, TECHNIQUE } from './classics-fixture.mjs';

const NOTE = `Technique: ${TECHNIQUE.name.en}`;
const START = 'What do you want to cook?';

const fresh = async (browser, origin, width) => {
  const context = await browser.newContext({
    viewport: { width, height: width < 720 ? 720 : 700 },
  });
  const problems = watch(context, origin);
  const page = await context.newPage();
  return { context, page, problems };
};
const heading = (page, name) => page.getByRole('heading', { level: 1, name, exact: true });
const layout = async (page, label) => {
  const o = await overflow(page);
  check(o.scroll <= 0 && o.wide.length === 0, `${label}: no horizontal scroll ${o.wide.join(',')}`);
  const small = await smallTargets(page);
  check(small.length === 0, `${label}: targets at least 44 x 44 ${small.join('; ')}`);
};
const focused = (page) =>
  page.evaluate(() => `${document.activeElement?.tagName}:${document.activeElement?.textContent}`);
const skills = (page) =>
  page.evaluate(async () => (await (await globalThis.__culinaStore).store.list('skills')).records);
const stored = (page, kind) =>
  page.evaluate(async (k) => (await (await globalThis.__culinaStore).store.list(k)).records, kind);
const step = (page, n, total) =>
  page.getByRole('heading', { level: 2, name: `Step ${n} of ${total}` });

const flow = async (browser, origin, width) => {
  const label = `${width}px classics`;
  const { context, page, problems } = await fresh(browser, origin, width);
  await openWith(page, origin, 'start');
  await heading(page, START).waitFor();
  check(
    await page.evaluate(() => document.activeElement === document.body),
    `${label}: nothing is focused on open`,
  );
  for (const tool of ['Ratios', 'Components', 'Dishes', 'What can I cook', 'What is there']) {
    check(
      (await page.locator('main').getByRole('link', { name: tool, exact: true }).count()) === 1,
      `${label}: the tool "${tool}" is still reachable from Start`,
    );
  }
  const countries = await page.locator('.country-list li').allInnerTexts();
  check(
    JSON.stringify(countries.map((t) => t.trim())) ===
      JSON.stringify(['Germany, 1 dish', 'Italy, 1 dish', 'France, 0 dishes', 'Spain, 0 dishes']),
    `${label}: the four countries with their counts (${countries.join(' | ')})`,
  );
  await layout(page, `${label} start`);

  // Country list, and an empty country.
  await page.getByRole('link', { name: 'France, 0 dishes' }).click();
  await heading(page, 'France').waitFor();
  check(
    (await page.locator('.empty-country').count()) === 1,
    `${label}: an empty country shows a quiet empty state`,
  );
  await page.goBack();
  await page.getByRole('link', { name: 'Germany, 1 dish' }).click();
  await heading(page, 'Germany').waitFor();
  const row = (await page.locator('.classic-link').innerText()).replace(/\s+/g, ' ');
  check(
    row.includes(PAN.name.en) &&
      row.includes('Main course') &&
      row.includes('Without meat and fish'),
    `${label}: the dish row has name, course and meat flag (${row})`,
  );
  await layout(page, `${label} country`);
  await page.getByRole('link', { name: 'Italy' }).count();

  // Dish view.
  await page.locator('.classic-link').click();
  await heading(page, PAN.name.en).waitFor();
  check(
    await page.getByText(`Original name: ${PAN.originalName}`).isVisible(),
    `${label}: the original name`,
  );
  const text = await page.locator('.classic-card').innerText();
  check(
    text.includes(PAN.source.author) &&
      text.includes(PAN.source.title) &&
      text.includes(String(PAN.source.year)) &&
      text.includes(PAN.source.place) &&
      text.includes('amounts for 4 persons'),
    `${label}: source, place and the persons the source states`,
  );
  check(
    (await page.getByRole('link', { name: 'Open the source' }).getAttribute('href')) ===
      PAN.source.url,
    `${label}: the source link`,
  );
  check(
    (await page.getByLabel('Portions', { exact: true }).inputValue()) === '2',
    `${label}: portions default to 2`,
  );
  const fat = () =>
    page
      .locator('.recipe-line')
      .filter({ hasText: 'Butter, salted' })
      .first()
      .locator('.recipe-amount')
      .innerText();
  const g2 = engineGrams(PAN, 'fat', 2);
  check((await fat()) === `${g2} g`, `${label}: amount is the engine's for 2 portions (${g2} g)`);
  await page.getByRole('button', { name: 'More portions' }).click();
  await page.getByRole('button', { name: 'More portions' }).click();
  const g4 = engineGrams(PAN, 'fat', 4);
  check((await fat()) === `${g4} g`, `${label}: 4 portions give the engine's ${g4} g`);
  await page.getByLabel('Portions', { exact: true }).fill('2');
  const lines = await page.locator('.recipe-block .recipe-line').allInnerTexts();
  const flat = lines.map((l) => l.replace(/\s+/g, ' '));
  check(
    flat.some((l) => l.includes('to taste')),
    `${label}: a line without an amount says "to taste"`,
  );
  check(
    flat.some((l) => l.includes('100 ml to 150 ml') && l.includes('settled by us')),
    `${label}: a range, marked as settled`,
  );
  check(
    flat.some((l) => l.includes('(2 Example-measures)')),
    `${label}: the source's own wording`,
  );
  check(
    await page.getByText('Melt the fat over low heat. · 5 min').isVisible(),
    `${label}: the whole recipe is on this screen`,
  );
  const settled = page.locator('.settled-block');
  check(
    !((await settled.getAttribute('open')) !== null),
    `${label}: what we settled is behind a tap`,
  );
  await settled.locator('summary').click();
  check(
    await settled.getByText('Amount of oil: 200 to 300 ml').isVisible(),
    `${label}: the settled entry opens`,
  );
  check(
    await page.getByText('A second person read the same text.').isVisible(),
    `${label}: the second check`,
  );
  await layout(page, `${label} dish`);

  // Step by step.
  await page.getByRole('link', { name: 'Cook step by step' }).click();
  await heading(page, PAN.name.en).waitFor();
  await step(page, 1, 3).waitFor();
  check((await page.locator('.cook-step-text').count()) === 1, `${label}: one step on the screen`);
  check(await page.getByText('Time: 5 min').isVisible(), `${label}: the time of the step`);
  check(
    (await page.locator('.cook-step .recipe-line .recipe-amount').first().innerText()) ===
      `${g2} g`,
    `${label}: the step shows its line with the engine's amount`,
  );
  check(
    await page.getByRole('heading', { name: NOTE }).isVisible(),
    `${label}: the technique note shows`,
  );
  check(
    (await page.locator('.technique-note p').first().innerText()) === TECHNIQUE.watch.en,
    `${label}: the note says what to watch`,
  );
  check(
    !((await page.locator('.technique-more').getAttribute('open')) !== null),
    `${label}: why, level and sources are behind a tap`,
  );
  await page.locator('.technique-more summary').click();
  const more = await page.locator('.technique-more').innerText();
  check(
    more.includes(TECHNIQUE.why.en) &&
      more.includes('Textbook') &&
      more.includes(TECHNIQUE.sources[0].title),
    `${label}: why, the level and the source`,
  );
  check((await skills(page)).length === 0, `${label}: nothing is marked as learned automatically`);
  await layout(page, `${label} step 1`);
  await page.getByRole('button', { name: 'Next' }).click();
  await step(page, 2, 3).waitFor();
  check(
    (await focused(page)).startsWith('H2:Step 2 of 3'),
    `${label}: focus moves to the step heading`,
  );
  check(
    await page.getByText('Temperature: 170 to 180 °C').isVisible(),
    `${label}: the temperature as the source gives it`,
  );
  check(
    (await page.getByRole('heading', { name: NOTE }).count()) === 0,
    `${label}: the note is shown once, at the first step that uses the technique`,
  );
  const box = await page.getByRole('button', { name: 'Next' }).boundingBox();
  check(
    box.height >= 44 && box.width >= 100,
    `${label}: large Next button (${box.width} x ${box.height})`,
  );
  await page.getByRole('button', { name: 'Back' }).click();
  await step(page, 1, 3).waitFor();
  check(true, `${label}: Back returns to step 1`);
  await page.locator('.cook-whole summary').click();
  check(
    await page.locator('.cook-whole').getByRole('heading', { name: 'Ingredients' }).isVisible(),
    `${label}: the whole recipe is one tap away`,
  );
  await page.locator('.cook-whole summary').click();

  // I know this.
  await page.getByRole('button', { name: 'I know this' }).click();
  await page.getByText('Marked as learned: Example technique (fictional).').waitFor();
  check(
    (await page.getByRole('heading', { name: NOTE }).count()) === 0,
    `${label}: the note is gone after "I know this"`,
  );
  const marked = await skills(page);
  check(
    marked.length === 1 && marked[0].id === 'skill-example-technique' && marked[0].learned === true,
    `${label}: a skill record is stored`,
  );
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await step(page, 3, 3).waitFor();
  check(
    (await page.getByRole('button', { name: 'Finish' }).count()) === 1,
    `${label}: the last step offers Finish`,
  );
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('heading', { level: 2, name: 'Done cooking' }).waitFor();
  check(
    (await focused(page)).startsWith('H2:Done cooking'),
    `${label}: focus moves to the end of cooking`,
  );
  await layout(page, `${label} done`);
  check(
    (await stored(page, 'dishes')).length === 0,
    `${label}: nothing is written before the cook asks`,
  );
  await page.getByRole('button', { name: 'Keep in my notebook' }).click();
  await heading(page, PAN.name.en).waitFor();
  await page
    .locator('.rows')
    .first()
    .waitFor()
    .catch(() => undefined);
  const dishes = await stored(page, 'dishes');
  const components = await stored(page, 'components');
  check(
    page.url().includes('#/dishes/') &&
      dishes.length === 1 &&
      dishes[0].version.family === dishes[0].id &&
      dishes[0]['x-origin']?.classic === PAN.id &&
      components.length === 1 &&
      components[0]['x-origin']?.author === PAN.source.author,
    `${label}: kept as version 1 of a new dish with its origin`,
  );
  check(
    (await stored(page, 'dishes')).every((d) => d.id !== PAN.id),
    `${label}: the classic itself is not stored`,
  );

  // The next dish: the learned technique has no note; a wanted line explains why it cannot be kept.
  await openWith(page, origin, `classic/${SECOND.id}/cook`);
  await step(page, 1, 2).waitFor();
  check(
    (await page.getByRole('heading', { name: NOTE }).count()) === 0,
    `${label}: the learned skill's note is not shown on the next dish`,
  );
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('heading', { level: 2, name: 'Done cooking' }).waitFor();
  check(
    (await page.locator('.keep-cannot').count()) === 1 &&
      (await page.getByRole('button', { name: 'Keep in my notebook' }).count()) === 0,
    `${label}: a wanted ingredient replaces the offer with an explanation`,
  );
  const sentence = await page.locator('.keep-cannot').innerText();
  check(
    sentence.includes('Example broth stock'),
    `${label}: the explanation names it (${sentence})`,
  );

  // Settings: Teach again.
  await openWith(page, origin, 'settings');
  await heading(page, 'Settings').waitFor();
  const own = page.locator('.skill-row');
  check(
    (await own.count()) === 1 && (await own.innerText()).includes(TECHNIQUE.name.en),
    `${label}: Settings lists the learned skill`,
  );
  await layout(page, `${label} settings`);
  await page.getByRole('button', { name: `Teach again: ${TECHNIQUE.name.en}` }).click();
  await page.getByText(`The note for ${TECHNIQUE.name.en} is shown again.`).waitFor();
  check(
    (await skills(page))[0].learned === false,
    `${label}: Teach again stores the mark taken back`,
  );
  check(
    (await page.locator('.skill-row').count()) === 0 &&
      (await page.locator('.skills-none').isVisible()),
    `${label}: the list is empty again`,
  );
  await openWith(page, origin, `classic/${SECOND.id}/cook`);
  await step(page, 1, 2).waitFor();
  check(
    (await page.getByRole('heading', { name: NOTE }).count()) === 1,
    `${label}: the note shows again after Teach again`,
  );

  // Content language.
  await openWith(page, origin, 'settings');
  await page.getByLabel('Deutsch').check();
  check(
    (await page.evaluate(() => localStorage.getItem('culina.lang'))) === 'de',
    `${label}: the content language is kept`,
  );
  await openWith(page, origin, `classic/${PAN.id}`);
  await heading(page, PAN.name.de).waitFor();
  check(
    await page.getByText('Ein erfundenes Beispiel, kein Rezept.').isVisible(),
    `${label}: dish texts follow the content language`,
  );
  check(
    (await page.locator('.recipe-block').first().innerText()).includes('Example'),
    `${label}: the app's own texts stay English`,
  );
  await openWith(page, origin, 'settings');
  await page.getByLabel('Follow device').check();
  await openWith(page, origin, `classics/it`);
  check(
    (await page.locator('.classic-link').innerText()).includes(SECOND.name.en),
    `${label}: Follow device shows English here`,
  );
  await layout(page, `${label} dish (German list reset)`);

  check(
    problems.length === 0,
    `${label}: no console errors or foreign requests ${problems.join('; ')}`,
  );
  await context.close();
};

const empty = async (browser, origin) => {
  const label = 'classics with no dish';
  const { context, page, problems } = await fresh(browser, origin, 360);
  await page.goto(`${origin}/?no-sw#/start`);
  await heading(page, START).waitFor();
  await page.getByRole('link', { name: /^Germany/ }).click();
  await heading(page, 'Germany').waitFor();
  check(
    (await page.locator('.empty-country').count()) === 1,
    `${label}: the app works with zero dishes`,
  );
  await page.goto(`${origin}/?no-sw#/classic/nothing`);
  check(
    (await page.getByText('This dish is not in the list.').count()) === 1,
    `${label}: an unknown dish is said quietly`,
  );
  await page.goto(`${origin}/?no-sw#/settings`);
  await heading(page, 'Settings').waitFor();
  check(
    await page.locator('.skills-none').isVisible(),
    `${label}: Settings says no skill is marked yet`,
  );
  check(problems.length === 0, `${label}: no console errors ${problems.join('; ')}`);
  await context.close();
};

export const classics = async (browser, server) => {
  await flow(browser, server.origin, 360);
  await flow(browser, server.origin, 1000);
  await empty(browser, server.origin);
};
