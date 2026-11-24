// "Dishes like this" on a dish page in a browser, on the shipped dishes, at 360 px in English and
// German: under the recipe and above the closed sections at the foot, the cheese gratins on the
// gratin dauphinois with what they share, each a link to its page; nothing at all on pot-au-feu,
// which shares only "with meat" (the control); a copy kept in the notebook is like the other
// gratins and never like its own shipped dish. What the matches are worth to a cook is not
// judged here: test/dish-like.test.ts holds the measure.
import { check, watch } from './harness.mjs';
import { layout, open } from './editor-helpers.mjs';

const hrefs = (page) =>
  page.locator('.like-section a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));

export const dishLike = async (browser, server) => {
  for (const [lang, heading, shares] of [
    ['en', 'Dishes like this', 'Shares: '],
    ['de', 'Ähnliche Gerichte', 'Gemeinsam: '],
  ]) {
    const label = `360px dishes like this (${lang})`;
    const context = await browser.newContext({
      viewport: { width: 360, height: 720 },
      locale: lang === 'de' ? 'de-DE' : 'en-GB',
    });
    const problems = watch(context, server.origin);
    const page = await context.newPage();
    await open(page, server.origin, 'classic/gratin-dauphinois');
    const section = page.locator('.like-section');
    await section.waitFor();
    check(
      (await section.locator('h2').innerText()).trim() === heading,
      `${label}: the section is named ${heading}`,
    );
    check(
      (await hrefs(page)).join() ===
        '#/classic/baked-potatoes-cheese,#/classic/cavolfiore-balsamella',
      `${label}: the two other cheese gratins, potatoes first (${(await hrefs(page)).join()})`,
    );
    const metas = await section.locator('.entry-meta').allInnerTexts();
    check(
      metas.length === 2 && metas.every((m) => m.startsWith(shares) && m.split(',').length === 3),
      `${label}: each row says the three characters it shares (${metas.join(' | ')})`,
    );
    const order = await page.evaluate(() => {
      const at = (s) =>
        [...document.querySelectorAll('.dish-card *')].indexOf(document.querySelector(s));
      return [at('.dish-results'), at('.like-section'), at('details.pairing-block')];
    });
    check(
      order[0] >= 0 && order[0] < order[1] && order[1] < order[2],
      `${label}: under the recipe, above the closed sections (${order.join(', ')})`,
    );
    check(
      !/\b(taste|tastes|schmeck\w*|better|besser)\b/i.test(await section.innerText()),
      `${label}: no claim that they taste alike`,
    );
    await layout(page, label);
    await section.locator('a').first().click();
    await page.waitForURL(/#\/classic\/baked-potatoes-cheese$/);
    await page.locator('.like-section').waitFor();
    check(
      (await hrefs(page))[0] === '#/classic/gratin-dauphinois',
      `${label}: a row opens that dish, whose page names the gratin back`,
    );

    // Control: pot-au-feu shares only "with meat" with the other meat dishes.
    await open(page, server.origin, 'classic/pot-au-feu');
    await page.locator('details.pairing-block').waitFor();
    await page.waitForLoadState('networkidle');
    await page.locator('.dish-results li').first().waitFor();
    check(
      (await page.locator('.like-section, .like-host *').count()) === 0,
      `${label}: pot-au-feu has no section at all`,
    );
    check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
    await context.close();
  }

  // An own dish: the gratin kept in the notebook.
  const label = '360px dishes like this, a kept copy';
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  await open(page, server.origin, 'classic/gratin-dauphinois');
  await page.locator('.like-section').waitFor();
  await page.locator('.classic-copy').getByRole('button', { name: 'Keep in my notebook' }).click();
  await page.waitForURL(/#\/dishes\//);
  await page.locator('.like-section').waitFor();
  check(
    (await hrefs(page)).join() ===
      '#/classic/baked-potatoes-cheese,#/classic/cavolfiore-balsamella',
    `${label}: the copy is like the other gratins, not its own shipped dish (${(await hrefs(page)).join()})`,
  );
  await layout(page, label);
  await open(page, server.origin, 'classic/gratin-dauphinois');
  await page.locator('.like-section').waitFor();
  check(
    (await hrefs(page)).every((h) => h.startsWith('#/classic/')),
    `${label}: the shipped gratin does not name its copy (${(await hrefs(page)).join()})`,
  );
  check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
  await context.close();
};
