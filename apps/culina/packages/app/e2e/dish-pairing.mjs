// "Goes with" on a dish in a browser, on a shipped dish and the shipped pairing data: closed at
// first and the data not fetched until it is opened; then ingredients the dish does not have,
// each with the dish's ingredients it goes with, the hint that this is computed and the source
// with its licence; the same in German. What the pairings are is not judged here: the engine's
// vectors and test/flavordb-data.test.ts hold the rule and the data.
import { check, watch } from './harness.mjs';
import { layout, open } from './editor-helpers.mjs';

const DISH = 'baked-potatoes-cheese';

export const dishPairing = async (browser, server) => {
  for (const [lang, heading, hint, source] of [
    ['en', 'Goes with', 'A hint, not a rule', 'CC BY-NC-SA 3.0'],
    ['de', 'Passt dazu', 'Ein Hinweis, keine Regel', 'CC BY-NC-SA 3.0'],
  ]) {
    const label = `360px goes with (${lang})`;
    const context = await browser.newContext({
      viewport: { width: 360, height: 720 },
      locale: lang === 'de' ? 'de-DE' : 'en-GB',
    });
    const problems = watch(context, server.origin);
    const fetched = [];
    context.on('request', (r) => {
      if (/pairing/.test(new URL(r.url()).pathname)) fetched.push(new URL(r.url()).pathname);
    });
    const page = await context.newPage();
    await open(page, server.origin, `classic/${DISH}`);
    const block = page.locator('details.pairing-block');
    await block.waitFor();
    check(
      (await block.locator('summary').innerText()).trim() === heading,
      `${label}: the section is named ${heading}`,
    );
    check(
      !(await block.evaluate((d) => d.open)) && fetched.length === 0,
      `${label}: closed at first, and the data is not fetched (${fetched.join(', ')})`,
    );
    const lines = await page.locator('.dish-results li').allInnerTexts();
    await block.locator('summary').click();
    const provenRows = block.locator('.pairing-proven .pairing-row');
    await provenRows.first().waitFor();
    check(
      (await provenRows.count()) >= 3 && (await provenRows.count()) <= 8,
      `${label}: proven together stands first, three to eight rows`,
    );
    const rows = block.locator('.pairing-computed .pairing-row');
    await rows.first().waitFor();
    check(
      fetched.sort().join() === '/pairing-links.json,/pairings.json',
      `${label}: opening it fetches the two files once (${fetched.join(', ')})`,
    );
    const names = await rows.locator('.pairing-name').allInnerTexts();
    const withs = await rows.locator('.pairing-with').allInnerTexts();
    check(
      names.length >= 3 && names.length <= 8 && new Set(names).size === names.length,
      `${label}: three to eight ingredients, each once (${names.join(', ')})`,
    );
    check(
      withs.length === names.length && withs.every((w) => w.length > 5),
      `${label}: every row names what it goes with (${withs.join(' | ')})`,
    );
    check(
      names.every((n) => !lines.some((l) => l.trim().endsWith(n))),
      `${label}: none of them is a line of the dish`,
    );
    const text = await block.innerText();
    check(
      text.includes(hint) && text.includes(source) && text.includes('FlavorDB'),
      `${label}: says it is a hint and names FlavorDB and its licence`,
    );
    check(
      !/\b(wrong|falsch|should|sollte|must|muss)\b/i.test(text),
      `${label}: no wording says wrong or should`,
    );
    await layout(page, label);
    // Closing and opening again asks for nothing more.
    await block.locator('summary').click();
    await block.locator('summary').click();
    await rows.first().waitFor();
    check(fetched.length === 2, `${label}: opened again without a new fetch (${fetched.length})`);
    check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
    await context.close();
  }
};
