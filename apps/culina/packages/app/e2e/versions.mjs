// Versions, history, tasting notes and variations in a browser: three versions of a component
// with the diff the engine computes, a restore as a fourth, tasting notes added and edited
// later, variation links both ways, "parent removed", a reload; then one pass for a dish.
import { check, watch } from './harness.mjs';
import { engine } from './notebook-fixture.mjs';
import { addNewIngredient, formReady, layout, listStore, open } from './editor-helpers.mjs';
import { seed } from './seed.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NAME = 'Pan sauce';
const label = '360px versions';

const save = async (page) => {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.locator('.version-lines').waitFor();
};

/** Opens the editor of the current version, sets the first two amounts and saves. */
const editAmounts = async (page, origin, id, amounts, fields = {}) => {
  await open(page, origin, `components/${id}/edit`);
  await formReady(page);
  for (const [index, value] of amounts) {
    await page.locator('.line-edit').nth(index).locator('input.field').first().fill(value);
  }
  if (fields.change) await page.getByLabel('What changed').fill(fields.change);
  if (fields.reason) await page.getByLabel('Why', { exact: true }).fill(fields.reason);
  if (fields.tasting) await page.getByLabel('Tasting note').fill(fields.tasting);
  await save(page);
};

const chain = (records, id) => {
  const family = records.find((r) => r.id === id).version.family;
  const mine = records.filter((r) => r.version.family === family);
  const byId = new Map(mine.map((r) => [r.id, r]));
  const depth = (r) => (byId.has(r.version.parent) ? 1 + depth(byId.get(r.version.parent)) : 0);
  return mine.sort((a, b) => depth(a) - depth(b));
};

const entryRows = (page, n) =>
  page.locator(`.history-entry[data-version="${n}"] .diff-row`).allTextContents();

const component = async (page, origin) => {
  await open(page, origin, 'components');
  await page.getByRole('link', { name: 'Add a component' }).click();
  await formReady(page);
  await page.getByLabel('Name', { exact: true }).fill(NAME);
  await addNewIngredient(page, 'Flour', 'flour', '30', 0);
  await addNewIngredient(page, 'Butter', '', '40', 1);
  await save(page);
  const [v1] = await listStore(page, 'components');
  check(
    (await page.locator('.version-line').innerText()).startsWith('Version 1 · '),
    `${label}: the first save is version 1`,
  );
  await layout(page, `${label} (component detail)`);
  await editAmounts(page, origin, v1.id, [[0, '35']], {
    change: 'More flour',
    reason: 'Thicker',
    tasting: 'Thick enough',
  });
  const v2 = (await listStore(page, 'components')).find((r) => r.version.parent === v1.id);
  await editAmounts(page, origin, v2.id, [[1, '50']], { change: 'More butter' });
  const all = await listStore(page, 'components');
  check(
    all.length === 3,
    `${label}: three stored version records, not one overwritten (${all.length})`,
  );
  const v3 = all.find((r) => r.version.parent === v2.id);
  check(
    v2.version.family === v1.id &&
      v3.version.family === v1.id &&
      v2.id !== v1.id &&
      v3.id !== v2.id &&
      v2.version.change === 'More flour' &&
      v2.version.reason === 'Thicker',
    `${label}: new ids, one family, parent links, change and reason stored`,
  );
  check(
    (await page.locator('.version-line').innerText()).startsWith('Version 3 · ') &&
      page.url().endsWith(`#/components/${v3.id}`),
    `${label}: Save opens the new current version (version 3)`,
  );
  const tastings = await listStore(page, 'tastings');
  check(
    tastings.length === 1 && tastings[0].ref.id === v2.id && tastings[0].text === 'Thick enough',
    `${label}: the tasting note typed next to Save is a record of its own on version 2`,
  );
  check(
    (await page.locator('.entry-row').count()) === 1 ||
      (await page.locator('.entry-name', { hasText: NAME }).count()) === 1,
    `${label}: the list shows one entry for the family`,
  );
  return { v1, v2, v3 };
};

const history = async (page, origin, { v1, v2, v3 }) => {
  await page.getByRole('link', { name: 'History' }).click();
  await page.locator('.history-entry').first().waitFor();
  check(page.url().endsWith(`#/components/${v3.id}/history`), `${label}: History route`);
  const order = await page
    .locator('.history-entry')
    .evaluateAll((n) => n.map((x) => x.dataset.version));
  check(same(order, ['3', '2', '1']), `${label}: versions newest first (${order})`);
  await layout(page, `${label} (history)`);
  const records = await listStore(page, 'components');
  const [a, b, c] = chain(records, v1.id);
  for (const [n, before, after] of [
    [3, b, c],
    [2, a, b],
  ]) {
    const want = engine.diffComponentVersions(before, after);
    const rows = await entryRows(page, n);
    const ok =
      want.ok &&
      rows.length === want.diff.changes.length &&
      want.diff.changes.every(
        (ch, i) =>
          ch.type === 'line' &&
          rows[i].startsWith('Changed: ') &&
          rows[i].includes(`${ch.before.amount.value} g → `) &&
          rows[i].includes(`${ch.after.amount.value} g`) &&
          rows[i].endsWith(`(${ch.fields.join(', ')})`),
      );
    check(ok, `${label}: the diff of version ${n} equals the engine's (${rows.join(' | ')})`);
  }
  check(
    (await page.locator('.history-entry[data-version="1"] .version-diff').innerText()).includes(
      'First version',
    ),
    `${label}: the first version has nothing to compare with`,
  );
  check(
    (await page.locator('.history-entry[data-version="2"]').innerText()).includes('Thick enough'),
    `${label}: the tasting note shows on version 2`,
  );

  // Open an old version read-only.
  await page
    .locator('.history-entry[data-version="1"]')
    .getByRole('link', { name: 'Open this version' })
    .click();
  await page.locator('.older-version').waitFor();
  check(
    page.url().endsWith(`#/components/${v1.id}`),
    `${label}: an old version opens at its own id`,
  );
  check(
    (await page.getByRole('link', { name: 'Edit' }).count()) === 0 &&
      (await page.getByRole('button', { name: 'Delete' }).count()) === 0 &&
      (await page.getByRole('button', { name: 'Make a variation' }).count()) === 0,
    `${label}: an old version offers no Edit, Delete or variation`,
  );
  await layout(page, `${label} (old version)`);
  check(
    (await page.locator('.older-version').innerText()).includes('This is an older version.'),
    `${label}: a quiet line says it is an older version`,
  );
  await page.getByRole('link', { name: 'Open the current version' }).click();
  await page.waitForURL(`**#/components/${v3.id}`);

  // Restore version 1 as a new version.
  const before = JSON.stringify(await listStore(page, 'components'));
  await page.getByRole('link', { name: 'History' }).click();
  await page.locator('.history-entry').first().waitFor();
  check(
    (await page.locator('.history-entry[data-version="3"] .restore').count()) === 0,
    `${label}: the current version has no Restore`,
  );
  await page.locator('.history-entry[data-version="1"] .restore').click();
  await page.waitForFunction(() => document.querySelectorAll('.history-entry').length === 4);
  const after = await listStore(page, 'components');
  const restored = after.find((r) => !JSON.parse(before).some((o) => o.id === r.id));
  check(
    after.length === 4 &&
      same(restored.lines, v1.lines) &&
      restored.version.parent === v3.id &&
      restored.version.change === 'Restored version 1',
    `${label}: Restore adds a fourth version equal to version 1, parent version 3`,
  );
  check(
    same(
      JSON.parse(before).sort((x, y) => (x.id < y.id ? -1 : 1)),
      after.filter((r) => r.id !== restored.id).sort((x, y) => (x.id < y.id ? -1 : 1)),
    ),
    `${label}: the three older records are unchanged`,
  );
  const order4 = await page
    .locator('.history-entry')
    .evaluateAll((n) => n.map((x) => x.dataset.version));
  check(
    same(order4, ['4', '3', '2', '1']),
    `${label}: the restored version is the newest (${order4})`,
  );
  return { ...{ v1, v2, v3 }, v4: restored };
};

const notes = async (page, { v1, v2 }) => {
  const entry = (n) => page.locator(`.history-entry[data-version="${n}"]`);
  const snapshot = JSON.stringify(await listStore(page, 'components'));
  await entry(1).getByRole('button', { name: 'Add a tasting note' }).click();
  check(
    (await page.getByLabel('Date of the tasting').inputValue()) !== '',
    `${label}: the date defaults to today`,
  );
  await page.getByRole('button', { name: 'Save note' }).click();
  check(
    (await page.locator('.note-form .hint').innerText()).includes('Write the note'),
    `${label}: an empty note says quietly that it needs text`,
  );
  await page.getByLabel('Tasting note').fill('Floury');
  await page.getByRole('button', { name: 'Save note' }).click();
  await entry(1).locator('.tasting-note').waitFor();
  await entry(1).getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Tasting note').fill('Floury, needs fat');
  await page.getByRole('button', { name: 'Save note' }).click();
  await page.getByText('Floury, needs fat').waitFor();
  const tastings = await listStore(page, 'tastings');
  check(
    tastings.length === 2 &&
      tastings.filter((t) => t.ref.id === v1.id).length === 1 &&
      tastings.some((t) => t.ref.id === v1.id && t.text === 'Floury, needs fat'),
    `${label}: a note added afterwards and then edited is one record on version 1`,
  );
  check(
    snapshot === JSON.stringify(await listStore(page, 'components')),
    `${label}: no version record changed by tasting notes`,
  );
  void v2;
};

const variation = async (page, origin, v) => {
  await open(page, origin, `components/${v.v4.id}`);
  await page.getByRole('button', { name: 'Make a variation' }).click();
  await page.waitForFunction(() =>
    /Pan sauce \(variation\)/.test(document.querySelector('h1')?.textContent ?? ''),
  );
  const all = await listStore(page, 'components');
  const made = all.find((r) => r.name === 'Pan sauce (variation)');
  check(
    made.version.family === made.id && made.version.parent === v.v4.id && all.length === 5,
    `${label}: a variation is a new record in a new family, parent the version it came from`,
  );
  const line = await page.locator('.variation-parent').innerText();
  check(
    line.startsWith('Variation of Pan sauce') && line.includes('version 4'),
    `${label}: the variation shows its parent (${line})`,
  );
  await layout(page, `${label} (variation)`);
  await page.locator('.variation-parent a').click();
  await page.waitForURL(`**#/components/${v.v4.id}`);
  await page.locator('.variation-list a').waitFor();
  const listed = await page.locator('.variation-list a').allTextContents();
  check(
    same(listed, ['Pan sauce (variation)']),
    `${label}: the parent lists its variation (${listed})`,
  );
  await page.locator('.variation-list a').click();
  await page.waitForURL(`**#/components/${made.id}`);
  check(true, `${label}: navigation works both ways`);

  // Reload keeps everything.
  await page.reload();
  await page.locator('.variation-parent').waitFor();
  check(
    (await page.locator('.variation-parent').innerText()).includes('Variation of Pan sauce'),
    `${label}: after a reload the variation link is still there`,
  );
  await open(page, origin, `components/${v.v1.id}/history`);
  await page.locator('.history-entry').first().waitFor();
  const order = await page
    .locator('.history-entry')
    .evaluateAll((n) => n.map((x) => x.dataset.version));
  check(
    same(order, ['4', '3', '2', '1']),
    `${label}: after a reload the history has four versions`,
  );
  check(
    (await page.getByText('Floury, needs fat').count()) === 1 &&
      (await page.getByText('Thick enough').count()) === 1,
    `${label}: after a reload both tasting notes are there`,
  );

  // Delete the parent: Undo brings every version back; a second delete leaves "parent removed".
  await open(page, origin, `components/${v.v4.id}`);
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByText('Restored Pan sauce').waitFor();
  check(
    (await listStore(page, 'components')).length === 5 &&
      (await listStore(page, 'tastings')).length === 2,
    `${label}: Undo of a delete brings back every version and note`,
  );
  await open(page, origin, `components/${v.v4.id}`);
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByText('Deleted Pan sauce').waitFor();
  const rest = await listStore(page, 'components');
  check(
    rest.length === 1 && rest[0].id === made.id && (await listStore(page, 'tastings')).length === 0,
    `${label}: deleting the parent tombstones every version and its notes, the variation stays`,
  );
  await open(page, origin, `components/${made.id}`);
  check(
    (await page.locator('.variation-parent').innerText()).includes('removed'),
    `${label}: the variation says its parent was removed`,
  );
  await layout(page, `${label} (parent removed)`);
};

const dishPass = async (page, origin) => {
  await seed(page, origin);
  await open(page, origin, 'dishes/example-vegetable-plate/edit');
  await formReady(page);
  await page.getByLabel('Portions', { exact: true }).fill('3');
  await page.getByLabel('What changed').fill('Three portions');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.locator('.version-lines').waitFor();
  check(
    (await page.locator('.version-line').innerText()).startsWith('Version 2 · '),
    `${label}: saving a dish adds version 2`,
  );
  await page.getByRole('link', { name: 'History' }).click();
  await page.locator('.history-entry').first().waitFor();
  const rows = await entryRows(page, 2);
  const dishes = await listStore(page, 'dishes');
  const [d1, d2] = chain(dishes, 'example-vegetable-plate');
  const want = engine.diffDishVersions(d1, d2);
  check(
    want.ok &&
      rows.length === 1 &&
      rows[0] === 'Portions: 2 → 3' &&
      want.diff.changes[0].field === 'portions',
    `${label}: the dish diff is the engine's (${rows.join(' | ')})`,
  );
  await page.locator('.history-entry[data-version="1"] .restore').click();
  await page.waitForFunction(() => document.querySelectorAll('.history-entry').length === 3);
  check(
    (await listStore(page, 'dishes')).filter((d) => d.version.family === 'example-vegetable-plate')
      .length === 3,
    `${label}: Restore adds a third dish version`,
  );
  await layout(page, `${label} (dish history)`);

  await open(page, origin, 'components/example-herb-oil/history');
  await page.locator('.history-entry').first().waitFor();
  check(
    (await page.locator('.history-entry').count()) === 2 &&
      (await entryRows(page, 2))[0].startsWith('Method: empty → Example text'),
    `${label}: the example herb oil has two versions`,
  );
};

export const versions = async (browser, server) => {
  const origin = server.url.replace(/\/$/, '');
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  const v = await component(page, origin);
  const all = await history(page, origin, v);
  await notes(page, all);
  await variation(page, origin, all);
  await context.close();

  const dishContext = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const dishProblems = watch(dishContext, origin);
  await dishPass(await dishContext.newPage(), origin);
  await dishContext.close();

  const wide = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  const widePage = await wide.newPage();
  await seed(widePage, origin);
  await open(widePage, origin, 'components/example-herb-oil/history');
  await widePage.locator('.history-entry').first().waitFor();
  const scroll = await widePage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(scroll <= 0, `desktop versions: the history fits without horizontal scroll`);
  await wide.close();

  check(
    problems.length === 0 && dishProblems.length === 0,
    `versions: no console errors, no foreign requests ${[...problems, ...dishProblems].join('; ')}`,
  );
};
