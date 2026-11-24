// "Goes with" in the dish editor, in a browser and with the shipped pairing data: nothing is
// fetched and nothing offered while the dish is empty; with a first ingredient chosen, three to
// eight ingredients are offered, each a button naming what it goes with; a tap adds it as a slot
// with the ingredient copied from the catalogue into the notebook, and the offers are drawn again
// without it; the same wording in German. Also here, because they were found in the same look at
// the editor: the fillings stand above course and cuisine, a new dish is not asked what changed,
// and the random pick without own components shows a way on. What a cook thinks of the pairings
// is not judged here.
import { check, watch } from './harness.mjs';
import { searchBox } from './catalogue-helpers.mjs';
import { formReady, layout, listStore, open } from './editor-helpers.mjs';

export const editorPairing = async (browser, server) => {
  for (const [lang, heading, addSlot, empty, hint] of [
    [
      'en',
      'Goes with',
      'Add an ingredient or component',
      'Choose a first ingredient',
      'A hint, not a rule',
    ],
    ['de', 'Passt dazu', undefined, 'Wähle oben eine erste Zutat', 'Ein Hinweis, keine Regel'],
  ]) {
    const label = `360px editor goes with (${lang})`;
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
    await open(page, server.origin, 'dishes/new');
    await page.locator('.dish-editor .line-edits').waitFor({ state: 'attached' });
    const section = page.locator('.pairing-suggest');
    await section.waitFor();
    check(
      (await section.locator('h2').innerText()).trim() === heading,
      `${label}: the section is named ${heading}`,
    );
    check(
      (await section.innerText()).includes(empty) && fetched.length === 0,
      `${label}: an empty dish offers nothing and fetches nothing (${fetched.join(', ')})`,
    );
    // The editor asks first for what goes into the dish; a new dish is not asked what changed.
    const order = await page.evaluate(() => {
      const top = (sel) => document.querySelector(sel)?.getBoundingClientRect().top;
      return {
        slots: top('.dish-editor .line-edits'),
        course: top('.dish-course'),
        changed: document.querySelectorAll('.version-fields input').length,
        tasting: document.querySelectorAll('.version-fields textarea').length,
      };
    });
    check(
      order.slots < order.course,
      `${label}: what goes into the dish stands above course and cuisine (${JSON.stringify(order)})`,
    );
    check(
      order.changed === 0 && order.tasting === 1,
      `${label}: a new dish is asked for a tasting note only, not for what changed`,
    );
    if (addSlot === undefined) {
      // The random pick in a notebook without components: no roll that can only say "none".
      await open(page, server.origin, 'dishes/random');
      const roles = page.locator('.pick-role-section');
      await roles.waitFor();
      check(
        (await roles.locator('.pick-roll, input').count()) === 0 &&
          (await roles.locator('a.pick-to-components').getAttribute('href')) === '#/components' &&
          (await roles.innerText()).includes('noch keine Komponenten'),
        `${label}: without own components the roll per role gives way to a link to the components`,
      );
      check(
        (await page.locator('.pick-dish-roll').count()) === 1,
        `${label}: "Surprise me with a dish" stays`,
      );
      await layout(page, `${label} random pick`);

      check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
      await context.close();
      continue;
    }
    await formReady(page);
    await page.getByRole('button', { name: addSlot }).click();
    await searchBox(page).fill('tomatoes');
    await page.locator('.picker-catalogue .picker-choice').first().click();
    // Proven together: the project's own table, there at once and before anything is fetched.
    const proven = section.locator('.pairing-proven button.pairing-add');
    await proven.first().waitFor();
    const provenNames = (await proven.locator('.pairing-name').allInnerTexts()).map((n) =>
      n.trim(),
    );
    check(
      ['Basil', 'Garlic', 'Oil, olive'].every((n) => provenNames.some((p) => p.startsWith(n))) &&
        provenNames.length <= 8,
      `${label}: proven together offers basil, garlic and olive oil with tomatoes (${provenNames.join(', ')})`,
    );
    check(
      (await section.innerText()).includes('a judgement of this app, written by an AI model'),
      `${label}: the proven pairs say that they are the app's judgement, written by an AI model`,
    );
    const adds = section.locator('.pairing-computed button.pairing-add');
    await adds.first().waitFor();
    check(
      fetched.sort().join() === '/pairing-links.json,/pairings.json',
      `${label}: the first ingredient fetches the two files once (${fetched.join(', ')})`,
    );
    const names = await adds.locator('.pairing-name').allInnerTexts();
    const withs = await adds.locator('.pairing-with').allInnerTexts();
    check(
      names.length >= 3 &&
        names.length <= 8 &&
        new Set(names).size === names.length &&
        !names.some((n) => provenNames.includes(n.trim())),
      `${label}: three to eight computed ingredients, each once and none that stands above (${names.join(', ')})`,
    );
    check(
      withs.length === names.length && withs.every((w) => w.length > 5),
      `${label}: every offer names what it goes with (${withs.join(' | ')})`,
    );
    const text = await section.innerText();
    check(
      text.includes(hint) && text.includes('FlavorDB') && text.includes('CC BY-NC-SA 3.0'),
      `${label}: says it is a hint and names FlavorDB and its licence`,
    );
    check(
      !/\b(wrong|falsch|should|sollte|must|muss)\b/i.test(text),
      `${label}: no wording says wrong or should`,
    );
    await layout(page, label);
    const before = (await listStore(page, 'ingredients')).length;
    const taken = names[0].trim();
    await adds.first().click();
    await page.waitForFunction(() => document.querySelectorAll('.slot-edit').length === 2);
    const slots = (await page.locator('.slot-edit .pick-name').allInnerTexts()).map((s) =>
      s.trim(),
    );
    check(slots[1] === taken, `${label}: a tap adds it as the second slot (${slots.join(' | ')})`);
    check(
      (await listStore(page, 'ingredients')).length > before,
      `${label}: the ingredient was copied from the catalogue into the notebook`,
    );
    check(
      await page.evaluate(
        () => document.activeElement === document.querySelector('[data-pick="1"]'),
      ),
      `${label}: the focus is on the new slot`,
    );
    await adds.first().waitFor();
    const after = (await adds.locator('.pairing-name').allInnerTexts()).map((s) => s.trim());
    check(
      !after.includes(taken) && after.length >= 1,
      `${label}: the offers are drawn again without it (${after.join(', ')})`,
    );
    check(fetched.length === 2, `${label}: no new fetch for the second draw (${fetched.length})`);
    check(problems.length === 0, `${label}: no console errors or foreign requests ${problems}`);
    await context.close();
  }
};
