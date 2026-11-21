// The classics in a browser, on the fictional example dishes: start -> the list (old country address) -> dish -> step by
// step -> mark a skill as learned -> the note is gone on the next dish -> Settings "Teach again" ->
// keep in the notebook. At 360 x 720 and at desktop size: no horizontal scroll, targets of at least
// 44 x 44, no console error, nothing focused when a screen opens, focus moves on a step change.
import { check, watch } from './harness.mjs';
import { brokenWords, overflow, smallTargets } from './measure.mjs';
import {
  engineGrams,
  openWith,
  PAN,
  RULE_BUTTER,
  RULE_OIL,
  SECOND,
  SUB_BUTTER,
  TECHNIQUE,
} from './classics-fixture.mjs';
import { nutritionSection } from './classics-nutrition.mjs';

const NOTE = `Technique: ${TECHNIQUE.name.en}`;
const START = 'What do you feel like?';

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
  const broken = await brokenWords(page, '.recipe-amount, td.num, th.num');
  check(broken.length === 0, `${label}: no amount breaks inside a word ${broken}`);
};
const focused = (page) =>
  page.evaluate(() => `${document.activeElement?.tagName}:${document.activeElement?.textContent}`);
const skills = (page) =>
  page.evaluate(async () => (await (await globalThis.__culinaStore).store.list('skills')).records);
const stored = (page, kind) =>
  page.evaluate(async (k) => (await (await globalThis.__culinaStore).store.list(k)).records, kind);
/** Back and Next are on the screen without scrolling, above the bottom navigation, 44 px and up. */
const cookBar = async (page, label) => {
  await page.evaluate(() => scrollTo(0, 0));
  const view = await page.evaluate(() => ({ h: innerHeight, scroll: scrollY }));
  const nav = await page.locator('.app-nav').boundingBox();
  const next = await page.getByRole('button', { name: /^(Next|Finish)$/ }).boundingBox();
  const prev = await page.getByRole('button', { name: 'Back', exact: true }).boundingBox();
  const inView = (b) =>
    b !== null && b.y >= 0 && b.y + b.height <= view.h && b.height >= 44 && b.width >= 44;
  const abovePhoneNav = nav === null || nav.y < 100 || next.y + next.height <= nav.y + 1;
  check(
    view.scroll === 0 && inView(next) && inView(prev) && abovePhoneNav,
    `${label}: Back and Next are on the screen without scrolling, above the navigation (${JSON.stringify({ next, prev, nav: nav?.y })})`,
  );
};
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
  // Start lists the shipped dishes in the one list of every dish (e2e/dish-browse.mjs has the
  // filter); the old country lists are that list with a filter.
  const shown = await page.locator('.dish-row-shipped .entry-name').allInnerTexts();
  check(
    JSON.stringify(shown) === JSON.stringify([PAN.name.en, SECOND.name.en]),
    `${label}: Start lists the shipped dishes (${shown.join(' | ')})`,
  );
  await layout(page, `${label} start`);

  // The old address of an empty country: the list says nothing fits and offers Show all.
  await openWith(page, origin, 'classics/fr');
  await heading(page, 'Dishes').waitFor();
  check(
    (await page.locator('.dish-rows .empty').innerText()) === 'No dish fits these choices.' &&
      (await page.getByLabel('Cuisine', { exact: true }).locator('option:checked').innerText()) ===
        'France',
    `${label}: an empty country shows a quiet empty state, the country named`,
  );
  await openWith(page, origin, 'classics/de');
  await heading(page, 'Dishes').waitFor();
  const row = (await page.locator('.dish-row').innerText()).replace(/\s+/g, ' ');
  check(
    row.includes(PAN.name.en) && row.includes('Main course') && row.includes('Germany'),
    `${label}: the dish row has name, course and cuisine (${row})`,
  );
  await layout(page, `${label} country`);

  // Dish view.
  await page.locator('.dish-row').click();
  await heading(page, PAN.name.en).waitFor();
  check(
    await page.getByText(`Original name: ${PAN.originalName}`).isVisible(),
    `${label}: the original name`,
  );
  check(
    (await page.locator('.dish-quiet').innerText()).includes('Shipped with the app') &&
      (await page
        .locator('.classic-copy')
        .getByRole('button', { name: 'Keep in my notebook' })
        .count()) === 1,
    `${label}: the quiet line names the origin, and the dish can be kept from its screen`,
  );
  // The source (with how it was checked and our remarks about it) is closed behind a tap, below the
  // method. What we settled and the second check have no disclosure of their own any more.
  const sourceSummary = page.locator('.foot-block summary', { hasText: /^Source$/ });
  check(
    (await sourceSummary.locator('..').getAttribute('open')) === null,
    `${label}: Source is behind a tap`,
  );
  check(
    (await page.locator('.settled-block, .check-block').count()) === 0,
    `${label}: no disclosure holds only maintainer texts (settled reasons, check notes)`,
  );
  const lineText = (await page.locator('.recipe-block').first().innerText()).replace(/\s+/g, ' ');
  check(
    !lineText.includes('Example-measures') && !lineText.includes('Invented example'),
    `${label}: the source's own wording and the remarks about the source are not in the lines`,
  );
  await sourceSummary.click();
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
    `${label}: a line without an amount says "to taste" where the data says so`,
  );
  check(
    flat.some((l) => l.includes('100 ml to 150 ml') && l.includes('settled by us')),
    `${label}: a range, marked as settled`,
  );
  check(
    !flat.some((l) => l.includes('(2 Example-measures)')),
    `${label}: the source's own wording is not in the line (it is in the source section)`,
  );
  check(
    await page.getByText('Melt the fat over low heat. · 5 min').isVisible(),
    `${label}: the whole recipe is on this screen`,
  );
  const sourceText = (await page.locator('.source-block').innerText()).replace(/\s+/g, ' ');
  check(
    sourceText.includes('Remarks on the source') &&
      sourceText.includes('“2 Example-measures”') &&
      sourceText.includes('Invented example: the source says to taste.'),
    `${label}: the source section holds the source's own wording and the remarks about it`,
  );
  check(
    sourceText.includes('A second person read the same text.') &&
      !sourceText.includes('Example only: a real file says who read the page') &&
      !sourceText.includes('the source says some'),
    `${label}: how it was checked is one sentence; the maintainer texts are not shown`,
  );
  // Substitutes: a quiet button on a line that has some, opened under the line.
  const instead = page.getByRole('button', { name: 'Instead of Butter, salted' });
  check((await instead.count()) === 1, `${label}: the butter line offers substitutes`);
  check(
    (await page.getByRole('button', { name: 'Instead of Salt, table' }).count()) === 0,
    `${label}: a line without substitutes has no button`,
  );
  check(
    (await instead.getAttribute('aria-expanded')) === 'false' &&
      !(await page.locator('.substitute-note').first().isVisible()),
    `${label}: the substitutes are behind a tap`,
  );
  await instead.click();
  const sub = page
    .locator('.recipe-line', { hasText: 'Butter, salted' })
    .locator('.substitute-note');
  check(
    (await sub.count()) === 1 &&
      (await sub.isVisible()) &&
      (await sub.innerText()).includes('Oil') &&
      (await sub.innerText()).includes('Amount: about half') &&
      (await sub.innerText()).includes(SUB_BUTTER.changes.en),
    `${label}: the replacement, the amount in words and what changes`,
  );
  check(
    (await sub.getByRole('button', { name: 'I know this' }).count()) === 0,
    `${label}: a substitute has no "I know this"`,
  );
  await sub.locator('.substitute-more summary').click();
  check(
    (await sub.locator('.substitute-more').innerText()).includes('Tradition') &&
      (await sub.locator('.substitute-sources a').count()) === 1,
    `${label}: level and source behind a tap`,
  );
  await layout(page, `${label} dish`);
  await instead.click();
  check(!(await sub.isVisible()), `${label}: a second tap closes the substitutes`);
  await nutritionSection(page, PAN, label);

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
  check(
    (await page.locator('.handling-note').count()) === 1 &&
      (await page.getByRole('heading', { name: 'Handling: Butter, salted' }).isVisible()) &&
      (await page.locator('.handling-note p').first().innerText()) === RULE_BUTTER.text.en,
    `${label}: the handling rule shows at the first step that uses its ingredient`,
  );
  check(
    (await page.locator('.cook-step aside').count()) === 2 &&
      (await page.locator('.cook-step aside').first().getAttribute('class')).includes(
        'technique-note',
      ),
    `${label}: two notes at most on a step, the technique note first`,
  );
  check(
    (await page.locator('.handling-more').getAttribute('open')) === null,
    `${label}: the rule's why, level and sources are behind a tap`,
  );
  await page.locator('.handling-more summary').click();
  check(
    (await page.locator('.handling-more').innerText()).includes('Tradition') &&
      (await page.locator('.handling-sources a').count()) === 1,
    `${label}: the rule's level and source`,
  );
  await layout(page, `${label} step 1`);
  await cookBar(page, `${label} step 1 (two notes make it tall)`);
  const cookText = (await page.locator('.cook-steps').innerText()).replace(/\s+/g, ' ');
  check(
    !cookText.includes('Example-measures') &&
      !cookText.includes('Invented example') &&
      !cookText.includes('Remarks on the source'),
    `${label}: no remark about the source and no original wording in cooking mode`,
  );
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
  check(
    (await page.getByRole('heading', { name: 'Handling: Butter, salted' }).count()) === 0 &&
      (await page.getByRole('heading', { name: 'Handling: Oil' }).count()) === 1 &&
      (await page.locator('.handling-note p').first().innerText()) === RULE_OIL.text.en,
    `${label}: a rule shows once; the next ingredient's rule shows at its step`,
  );
  check(
    (await page
      .getByRole('button', { name: 'Instead of Oil, olive, salad or cooking' })
      .count()) === 1,
    `${label}: the step's lines offer substitutes too`,
  );
  await page.getByRole('button', { name: 'Instead of Oil, olive, salad or cooking' }).click();
  check(
    (await page.locator('.cook-step .substitute-note').innerText()).includes('without a factor'),
    `${label}: a substitute without a factor shows only what the source says`,
  );
  await layout(page, `${label} step 2`);
  await cookBar(page, label);
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
  await page.locator('.technique-note').getByRole('button', { name: 'I know this' }).click();
  await page.getByText('Marked as learned: Example technique (fictional).').waitFor();
  check(
    (await page.getByRole('heading', { name: NOTE }).count()) === 0,
    `${label}: the note is gone after "I know this"`,
  );
  check(
    (await page.locator('.handling-note').count()) === 0,
    `${label}: the rules of that skill are gone with it`,
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
  check(
    (await page.locator('.handling-note').count()) === 1,
    `${label}: the handling rule shows again after Teach again`,
  );

  // "I know this" on a rule marks the same skill; it is gone on every dish.
  await page.locator('.handling-note').getByRole('button', { name: 'I know this' }).click();
  await page.getByText('Marked as learned: Example technique (fictional).').waitFor();
  const byRule = await skills(page);
  check(
    byRule.length === 1 && byRule[0].id === 'skill-example-technique' && byRule[0].learned === true,
    `${label}: "I know this" on a rule stores the same skill record`,
  );
  check(
    (await page.locator('.handling-note').count()) === 0 &&
      (await page.getByRole('heading', { name: NOTE }).count()) === 0,
    `${label}: the rule and the technique note are gone`,
  );
  await openWith(page, origin, `classic/${PAN.id}/cook`);
  await step(page, 1, 3).waitFor();
  check(
    (await page.locator('.handling-note').count()) === 0,
    `${label}: the rule is gone on another dish too`,
  );
  await page.getByRole('button', { name: 'Next' }).click();
  check(
    (await page.locator('.handling-note').count()) === 0 &&
      (await page
        .getByRole('button', { name: 'Instead of Oil, olive, salad or cooking' })
        .count()) === 1,
    `${label}: substitutes do not fade with the skill`,
  );
  await openWith(page, origin, 'settings');
  await page.getByRole('button', { name: `Teach again: ${TECHNIQUE.name.en}` }).click();
  await page.getByText(`The note for ${TECHNIQUE.name.en} is shown again.`).waitFor();
  await openWith(page, origin, `classic/${PAN.id}/cook`);
  await step(page, 1, 3).waitFor();
  check(
    (await page.locator('.handling-note').count()) === 1,
    `${label}: Teach again brings the rule back`,
  );

  // The one language setting: a change reloads the app, so its own texts follow it too.
  await openWith(page, origin, 'settings');
  await page.getByLabel('Deutsch').click();
  await page.waitForFunction(() => document.documentElement.lang === 'de');
  check(
    (await page.evaluate(() => localStorage.getItem('culina.lang'))) === 'de',
    `${label}: the content language is kept`,
  );
  await openWith(page, origin, `classic/${PAN.id}`);
  await heading(page, PAN.name.de).waitFor();
  check(
    !(await page.getByText('Ein erfundenes Beispiel, kein Rezept.').isVisible()),
    `${label}: the note on the dish is not among the ingredients (it is in the source section)`,
  );
  await page.locator('.source-block summary').click();
  check(
    await page.getByText('Ein erfundenes Beispiel, kein Rezept.').isVisible(),
    `${label}: dish texts follow the content language`,
  );
  check(
    (await page.getByRole('heading', { name: 'Zutaten' }).count()) >= 1,
    `${label}: the app's own texts follow the same setting`,
  );
  await openWith(page, origin, `classic/${PAN.id}/cook`);
  check(
    (await page.locator('.handling-note p').first().innerText()) === RULE_BUTTER.text.de,
    `${label}: the handling rule follows the content language`,
  );
  await openWith(page, origin, 'settings');
  await page.getByLabel('Wie das Gerät').click();
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  await openWith(page, origin, `classics/it`);
  check(
    (await page.locator('.dish-row').innerText()).includes(SECOND.name.en),
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
  // The shipped dishes are their own file: with an empty file the app has no dish at all.
  await page.route('**/classics.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: '{}' }),
  );
  await page.goto(`${origin}/?no-sw#/start`);
  await heading(page, START).waitFor();
  check(
    (await page.locator('.dish-row').count()) === 0 &&
      (await page.locator('.dish-rows .empty').count()) === 1,
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

// A source that is a printed book: the shipped pot-au-feu, whose step 4 names "Starting a stock
// cold", a note that rests on two books. A book is text with its ISBN, not a link.
const bookSource = async (browser, origin) => {
  const label = 'a note that rests on books';
  const { context, page, problems } = await fresh(browser, origin, 360);
  await page.goto(`${origin}/?no-sw#/classic/pot-au-feu`);
  await heading(page, 'Pot-au-feu (small pot)').waitFor();
  await page.getByRole('link', { name: 'Cook step by step' }).click();
  await step(page, 1, 20).waitFor();
  for (let n = 2; n <= 4; n += 1) {
    await page.getByRole('button', { name: 'Next' }).click();
    await step(page, n, 20).waitFor();
  }
  check(
    await page.getByRole('heading', { name: 'Technique: Starting a stock cold' }).isVisible(),
    `${label}: the step where the water goes in shows the note`,
  );
  await page.locator('.technique-more summary').click();
  const items = await page.locator('.technique-sources li').allInnerTexts();
  check(
    items.length === 2 && items.every((t) => t.startsWith('Textbook · ')),
    `${label}: two sources, each with its level (${items.length})`,
  );
  check(
    items.some((t) => t.includes('McGee') && t.endsWith('(ISBN 9780340831496)')) &&
      items.some((t) => t.includes('Der junge Koch') && t.endsWith('(ISBN 9783805708388)')),
    `${label}: each book is named with the ISBN of the edition read`,
  );
  check(
    (await page.locator('.technique-sources a').count()) === 0,
    `${label}: a book is text, not a link`,
  );
  await layout(page, label);
  check(problems.length === 0, `${label}: no console or request problem ${problems.join('; ')}`);
  await context.close();
};

export const classics = async (browser, server) => {
  await flow(browser, server.origin, 360);
  await flow(browser, server.origin, 1000);
  await empty(browser, server.origin);
  await bookSource(browser, server.origin);
};
