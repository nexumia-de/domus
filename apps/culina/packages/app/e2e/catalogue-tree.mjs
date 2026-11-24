// The grouped catalogue picker: parents first, variants below their parent (collapsed while the
// parent is itself a match, open on the way to a matching variant), keyboard and touch targets,
// choosing a variant or a parent stores the chain, the numbers agree with the engine.
import {
  addLine,
  chainOf,
  file,
  idsWithChains,
  rowNamed,
  searchBox,
  shownName,
  setAmount,
} from './catalogue-helpers.mjs';
import { check } from './harness.mjs';
import { formReady, layout, listStore, open } from './editor-helpers.mjs';
import { engine } from './notebook-fixture.mjs';
import { shown } from './ratio-fixture.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ROOT = rowNamed('Wheat flour'); // a generated group at the top, collapsed when it matches
const MID = rowNamed('Wheat flour, white, all-purpose, enriched'); // a parent with its own density
const VARIANT = rowNamed('Wheat flour, white, all-purpose, enriched, unbleached');
const below = (row) => file.ingredients.filter((r) => chainOf(r).some((c) => c.id === row.id));

const catalogue = (page) => page.locator('.picker-catalogue');
const toggle = (page, verb, name) =>
  catalogue(page).getByRole('button', { name: `${verb} the variants of ${name}` });
const choice = (page, row) =>
  catalogue(page).getByRole('button', { name: new RegExp(`^${row.name} by `) });
const storedIds = async (page) => (await listStore(page, 'ingredients')).map((r) => r.id).sort();
const factsOf = (row) => ({
  ...(row.densityGPerMl ? { densityGPerMl: row.densityGPerMl.value } : {}),
  ...(row.unitWeightG ? { unitWeightG: row.unitWeightG.value } : {}),
});

const browse = async (page, label) => {
  await searchBox(page).fill('wheat flour');
  const root = toggle(page, 'Show', shownName(ROOT));
  await root.waitFor();
  const count = below(ROOT).length;
  check(
    (await root.getAttribute('aria-expanded')) === 'false' &&
      (await root.innerText()).includes(`${count} variants`),
    `${label}: "${ROOT.name}" is a parent, collapsed, with its ${count} variants counted`,
  );
  const first = await catalogue(page).locator('.picker-node').first().innerText();
  check(
    first.startsWith(ROOT.name) &&
      (await catalogue(page)
        .locator('.picker-node')
        .first()
        .locator('.picker-children')
        .count()) === 0,
    `${label}: a matching parent comes first and no variant is drawn below it yet`,
  );
  await layout(page, `${label} (collapsed parent)`);

  // Keyboard: the toggle is a button in the tab order; Enter opens, Space closes.
  await root.focus();
  await page.keyboard.press('Enter');
  const opened = toggle(page, 'Hide', shownName(ROOT));
  await opened.waitFor();
  check(
    (await opened.getAttribute('aria-expanded')) === 'true' &&
      (await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) ===
        `Hide the variants of ${shownName(ROOT)}`,
    `${label}: Enter on the toggle opens the variants and the focus stays on it`,
  );
  const kids = await catalogue(page)
    .locator('.picker-children')
    .first()
    .locator(':scope > li > .picker-group .entry-name, :scope > li > .picker-choice .entry-name')
    .allInnerTexts();
  check(
    kids.length > 0 && kids.every((name) => !name.startsWith(ROOT.name)),
    `${label}: variants show what follows their parent's name ${JSON.stringify(kids.slice(0, 3))}`,
  );
  await layout(page, `${label} (opened parent)`);
  await page.keyboard.press('Space');
  await toggle(page, 'Show', shownName(ROOT)).waitFor();
  check(true, `${label}: Space on the toggle closes it again`);
};

const matchedVariant = async (page, label) => {
  await searchBox(page).fill('enriched, unbleached');
  const found = choice(page, VARIANT);
  await found.waitFor();
  const path = await found.evaluate((button) => {
    const names = [];
    for (
      let li = button.closest('li');
      li?.closest('.picker-catalogue');
      li = li.parentElement.closest('li')
    ) {
      names.unshift(li.querySelector('.entry-name').textContent);
    }
    return names;
  });
  const parts = [...chainOf(VARIANT), VARIANT].map((row, i, all) =>
    i === 0 ? row.name : row.name.slice(all[i - 1].name.length + 2),
  );
  check(
    same(path, parts),
    `${label}: a matched variant is under the parents that lead to it, each named by its own part ${JSON.stringify(path)}`,
  );
  check(
    (await found.innerText()).replace(/\s+/g, ' ') === 'unbleached by volume',
    `${label}: the variant row shows its own part and what it converts`,
  );
  await layout(page, `${label} (matched variant under its parents)`);
};

export const catalogueTree = async (browser, origin) => {
  const label = 'catalogue tree';
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const page = await context.newPage();
  await open(page, origin, 'components/new');
  await formReady(page);
  check((await storedIds(page)).length === 0, `${label}: the notebook starts empty`);
  await addLine(page);
  await browse(page, label);
  await matchedVariant(page, label);

  // Choosing a parent saves just its parent chain and itself, as the catalogue rows.
  await searchBox(page).fill(MID.name);
  await choice(page, MID).click();
  await page.locator('.picker').waitFor({ state: 'detached' });
  check(
    same(await storedIds(page), idsWithChains(MID)),
    `${label}: choosing a parent stores it and the parents above it, nothing below`,
  );
  await setAmount(page, 0, '1', 'cup');

  // Choosing a variant saves only the parents that are not there yet.
  await addLine(page);
  await searchBox(page).fill('enriched, unbleached');
  await choice(page, VARIANT).click();
  await page.locator('.picker').waitFor({ state: 'detached' });
  const ids = await storedIds(page);
  check(
    same(ids, idsWithChains(MID, VARIANT)) && ids.length === idsWithChains(MID).length + 1,
    `${label}: choosing a variant adds just the variant, its parents were there`,
  );
  await setAmount(page, 1, '2', 'cup');

  const stored = await listStore(page, 'ingredients');
  check(
    // The role table adds `roles` to some entries when the catalogue is read; nothing else changes.
    stored.every((record) => {
      const r = { ...record };
      delete r.roles;
      return same(
        r,
        file.ingredients.find((x) => x.id === r.id),
      );
    }),
    `${label}: every stored record is its catalogue entry, unchanged (parent link included; roles come from the role table)`,
  );
  const model = engine.validateModel({ ingredients: stored });
  check(
    model.ok && stored.every((r) => r.parentId === undefined || ids.includes(r.parentId)),
    `${label}: the notebook's ingredient tree is whole (validateModel: no finding)`,
  );

  await page.getByLabel('Name', { exact: true }).fill('Grouped flour');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Grouped flour' }).waitFor();
  const [component] = await listStore(page, 'components');
  const expected = engine.componentLineGrams(
    {
      id: component.id,
      lines: [
        { ref: { kind: 'ingredient', id: MID.id }, amount: { value: 1, unit: 'cup' } },
        { ref: { kind: 'ingredient', id: VARIANT.id }, amount: { value: 2, unit: 'cup' } },
      ],
    },
    { [MID.id]: factsOf(MID), [VARIANT.id]: factsOf(VARIANT) },
  );
  if (!expected.ok) throw new Error(`engine: ${expected.error.code}`);
  const grams = await page.evaluate(() =>
    [...document.querySelectorAll('.lines-table tbody tr')].map((tr) =>
      tr.children[1].textContent.trim(),
    ),
  );
  check(
    same(
      grams,
      expected.lines.map((l) => shown(l.g)),
    ),
    `${label}: the grams of the parent's own density and the variant's are the engine's ${JSON.stringify(grams)}`,
  );
  await context.close();
};
