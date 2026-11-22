// The component editor in a browser: percent and weight against the engine, reload, delete and
// undo, cycles, drafts. Expected numbers come from the engine bundled in notebook-fixture.mjs.
import { check, watch } from './harness.mjs';
import { engine } from './notebook-fixture.mjs';
import {
  addNewIngredient,
  figures,
  formReady,
  layout,
  lineValues,
  listStore,
  noFieldFocused,
  open,
  putStore,
} from './editor-helpers.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NAME = 'My bread dough';
// The list holds the shipped components too (e2e/components-shipped.mjs); here only the notebook's rows.
const names = (page) => page.locator('.component-row-own .entry-name').allTextContents();

const create = async (page, origin) => {
  const label = '360px editor';
  await open(page, origin, 'components');
  check(
    (await page.locator('.groups .empty').innerText()) ===
      'Nothing here yet. Write your first component, or start from a ratio.',
    `${label}: an empty notebook shows one quiet, inviting line`,
  );
  await page.getByRole('link', { name: 'Add a component' }).click();
  await formReady(page);
  check(
    page.url().endsWith('#/components/new'),
    `${label}: Add a component opens #/components/new`,
  );
  check(await noFieldFocused(page), `${label}: no field is focused when the editor opens`);
  await layout(page, `${label} (new component)`);

  await page.getByLabel('Name', { exact: true }).fill(NAME);
  await addNewIngredient(page, 'Flour', 'flour', '500', 0);
  await addNewIngredient(page, 'Water', '', '300', 1);
  await addNewIngredient(page, 'Salt', '', '10', 2);
  check(
    same(await lineValues(page), [
      ['Flour', '500', 'g'],
      ['Water', '300', 'g'],
      ['Salt', '10', 'g'],
    ]),
    `${label}: three lines entered by weight`,
  );

  // Percent entry: reference ingredient, live conversion by the engine.
  await page.getByLabel('Percent of a reference').check();
  check(
    same(
      (await lineValues(page)).map((l) => l[2]),
      ['g', 'g', 'g'],
    ),
    `${label}: percent entry without a reference keeps the weights`,
  );
  await page.getByLabel('Reference ingredient (100 %)').selectOption({ label: 'Flour' });
  const line = (id, amount, role) => ({
    ref: { kind: 'ingredient', id },
    amount: { value: amount, unit: 'g' },
    ...(role ? { role } : {}),
  });
  const ingredients = await listStore(page, 'ingredients');
  const idOf = (n) => ingredients.find((i) => i.name === n).id;
  const weights = {
    id: 'x',
    percentBase: 'flour',
    lines: [line(idOf('Flour'), 500, 'flour'), line(idOf('Water'), 300), line(idOf('Salt'), 10)],
  };
  const asPercent = engine.convertComponentLines(weights, 'percent').lines;
  check(
    same(
      await lineValues(page),
      asPercent.map((l, i) => [
        ['Flour', 'Water', 'Salt'][i],
        String(l.amount.value),
        l.amount.unit === 'percent' ? '%' : l.amount.unit,
      ]),
    ),
    `${label}: the percentages shown are the engine's (water 60, salt 2)`,
  );
  const grams = engine.componentLineGrams({ ...weights, lines: asPercent }).lines;
  check(
    same(
      (await figures(page)).slice(1, 3),
      grams.slice(1, 3).map((g) => `= ${Number(g.g.toFixed(1))} g`),
    ),
    `${label}: each percent line shows the grams it comes to`,
  );
  await layout(page, `${label} (percent entry)`);

  // Back to weight, then to percent again; saved in percent.
  await page.getByLabel('Weight', { exact: true }).check();
  check(
    same(
      (await lineValues(page)).map((l) => l[1]),
      ['500', '300', '10'],
    ),
    `${label}: switching to weight gives the weights back`,
  );
  await page.getByLabel('Percent of a reference').check();
  await page.getByLabel('Output as weighed').fill('800');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: NAME }).waitFor();
  check(
    page.url().endsWith(`#/components/${(await listStore(page, 'components'))[0].id}`),
    `${label}: Save opens the component`,
  );
  const [saved] = await listStore(page, 'components');
  check(
    same(
      saved.lines.map((l) => l.amount),
      asPercent.map((l) => l.amount),
    ) &&
      saved.percentBase === 'flour' &&
      saved.version.family === saved.id,
    `${label}: the record stores percent lines against percentBase, in its own version family`,
  );
  return saved;
};

const reloadEquals = async (page, origin, saved) => {
  const label = '360px editor';
  await open(page, origin, `components/${saved.id}/edit`);
  await formReady(page);
  check(await noFieldFocused(page), `${label}: editing a stored component focuses no field`);
  const facts = {};
  const shown = await lineValues(page);
  check(
    same(
      shown.map((l) => l[1]),
      saved.lines.map((l) => String(l.amount.value)),
    ),
    `${label}: after a reload the percentages are the stored values`,
  );
  await page.getByLabel('Weight', { exact: true }).check();
  const asWeight = engine.convertComponentLines(saved, 'weight', facts).lines;
  const afterSwitch = (await lineValues(page)).map((l) => l[1]);
  check(
    same(
      afterSwitch,
      asWeight.map((l) => String(l.amount.value)),
    ),
    `${label}: switching to weight after a reload gives the engine's weights (${afterSwitch})`,
  );
  const engineG = engine.componentLineGrams(saved, facts).lines.map((l) => Number(l.g.toFixed(6)));
  check(
    same(afterSwitch.map(Number), engineG),
    `${label}: the weights shown equal the engine's grams of the stored lines`,
  );
  // Leave without saving: the draft keeps this state; discard it.
  await page.getByRole('button', { name: 'Discard changes' }).click();
  // The form is rebuilt after the draft is dropped: wait for the stored values, not for any form.
  const storedValues = saved.lines.map((l) => String(l.amount.value));
  await page
    .waitForFunction(
      (want) =>
        JSON.stringify(
          [...document.querySelectorAll('.component-editor .line-edit input.field')].map(
            (i) => i.value,
          ),
        ) === JSON.stringify(want),
      storedValues,
      { timeout: 5000 },
    )
    .catch(() => undefined);
  check(
    same(
      (await lineValues(page)).map((l) => l[1]),
      storedValues,
    ),
    `${label}: Discard changes returns to the stored values`,
  );
};

const deleteUndo = async (page, origin, saved) => {
  const label = '360px editor';
  await open(page, origin, `components/${saved.id}`);
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByText(`Deleted ${NAME}`).waitFor();
  check(
    same(await names(page), []) && page.url().endsWith('#/components'),
    `${label}: delete acts at once, without a dialog, and leaves the list`,
  );
  check(
    (await listStore(page, 'components')).length === 0,
    `${label}: the record is gone from the store`,
  );
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByText(`Restored ${NAME}`).waitFor();
  check(same(await names(page), [NAME]), `${label}: Undo brings the component back`);
  const back = await listStore(page, 'components');
  check(same(back[0], saved), `${label}: the restored record equals the deleted one`);
  await page.reload();
  await page.getByRole('heading', { level: 1 }).waitFor();
  check(same(await names(page), [NAME]), `${label}: the restored component survives a reload`);
};

const cycles = async (page, origin) => {
  const label = '360px editor';
  const ing = { kind: 'ingredient', id: 'salt' };
  const rec = (id, name, ...subs) => ({
    id,
    name,
    lines: [
      { ref: ing, amount: { value: 5, unit: 'g' } },
      ...subs.map((s) => ({ ref: { kind: 'component', id: s }, amount: { value: 10, unit: 'g' } })),
    ],
    yield: { amount: { value: 100, unit: 'g' }, source: 'user' },
    version: { family: id, date: '2026-11-18' },
  });
  await open(page, origin, 'components');
  check(
    (await putStore(page, 'components', rec('cycle-b', 'Cycle B'))) === 'ok' &&
      (await putStore(page, 'components', rec('cycle-a', 'Cycle A', 'cycle-b'))) === 'ok',
    `${label}: two components, A uses B`,
  );
  await open(page, origin, 'components/cycle-b/edit');
  await formReady(page);
  await page.getByRole('button', { name: 'Add a component' }).click();
  const picker = page.locator('.picker');
  const blocked = await picker.locator('.picker-blocked').allInnerTexts();
  check(
    blocked.length === 2 &&
      blocked.some((t) => t.includes('Cycle B') && t.includes('this component')) &&
      blocked.some((t) => t.includes('Cycle A') && t.includes('uses this component')),
    `${label}: B cannot take itself or A (which uses B): both are shown and not offered (${blocked.join(' | ')})`,
  );
  check(
    (await picker.locator('button.picker-choice').count()) === 0 ||
      !(await picker.locator('button.picker-choice').allInnerTexts()).some((t) => /Cycle/.test(t)),
    `${label}: neither can be chosen`,
  );
  // Saving B as it is still works; nothing is stored that cycles.
  await page.getByRole('button', { name: 'Close' }).first().click();
  await page
    .locator('.line-edit')
    .last()
    .getByRole('button', { name: /^Remove/ })
    .click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: 'Cycle B' }).waitFor();
  const stored = await listStore(page, 'components');
  const b = stored.find((c) => c.id === 'cycle-b');
  check(
    !b.lines.some((l) => l.ref.kind === 'component'),
    `${label}: B holds no component after saving, so there is no cycle`,
  );
  // A line left empty by the picker is not a component: a stale draft with a cycle cannot be saved either.
  await page.evaluate(async () => {
    const opened = await globalThis.__culinaStore;
    await opened.store.drafts.put('component:cycle-b', {
      id: 'cycle-b',
      isNew: false,
      name: 'Cycle B',
      role: '',
      entry: 'weight',
      yieldAmount: '100',
      yieldUnit: 'g',
      method: '',
      lines: [{ ref: { kind: 'component', id: 'cycle-a' }, amount: '10', unit: 'g' }],
    });
  });
  await open(page, origin, 'components/cycle-b/edit');
  await formReady(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('A component cannot contain itself').waitFor();
  const again = (await listStore(page, 'components')).find((c) => c.id === 'cycle-b');
  check(
    !again.lines.some((l) => l.ref.kind === 'component'),
    `${label}: a draft that would make a cycle through A is refused with a quiet sentence and not stored`,
  );
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await page.waitForFunction(async () => {
    const opened = await globalThis.__culinaStore;
    return (await opened.store.drafts.list()).drafts.length === 0;
  });
};

const drafts = async (page, origin) => {
  const label = '360px editor';
  await open(page, origin, 'components/new');
  await formReady(page);
  await page.getByLabel('Name', { exact: true }).fill('Half written');
  // Leave at once, before the pause of the autosave: nothing is lost.
  await page.getByRole('link', { name: 'Ratios' }).click();
  await page.getByRole('heading', { level: 1, name: 'Ratios' }).waitFor();
  await open(page, origin, 'components/new');
  await formReady(page);
  check(
    (await page.getByLabel('Name', { exact: true }).inputValue()) === 'Half written',
    `${label}: leaving the screen loses nothing; the draft is back`,
  );
  await page.getByLabel('Name', { exact: true }).fill('Half written, then more');
  await page.waitForTimeout(700);
  await page.reload();
  await formReady(page);
  check(
    (await page.getByLabel('Name', { exact: true }).inputValue()) === 'Half written, then more',
    `${label}: the draft survives a reload`,
  );
  const drafts = await page.evaluate(async () => {
    const opened = await globalThis.__culinaStore;
    return (await opened.store.drafts.list()).drafts.map((d) => d.key);
  });
  check(
    same(drafts, ['component:new']),
    `${label}: one draft for the new component, in its own store ${drafts}`,
  );
  check(
    (await listStore(page, 'components')).every((c) => c.name !== 'Half written, then more'),
    `${label}: a draft is not a record`,
  );
  // Saving needs a name, a line and its ingredient: said quietly, nothing blocks anything else.
  await page.getByRole('button', { name: 'Add an ingredient' }).click();
  await page.getByRole('button', { name: 'Close' }).first().click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const lineError = page.locator('.line-edit .field-error').first();
  check(
    (await lineError.innerText()).includes('Choose an ingredient for line 1 to save it.'),
    `${label}: a line without an ingredient is said quietly at that line, not stored`,
  );
  check(
    (await lineError.getAttribute('role')) === 'alert' &&
      (await page.locator('.pick-btn').first().getAttribute('aria-describedby')) ===
        (await lineError.getAttribute('id')),
    `${label}: the message at the line is announced (role alert) and its button points at it`,
  );
  check(
    await page.evaluate(() => document.activeElement?.matches('.pick-btn[data-has-error]')),
    `${label}: the first field with a message takes the focus and points at its message`,
  );
  await page.getByLabel('Name', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const nameError = page.locator('.field-error:not(:empty)').first();
  check(
    (await nameError.innerText()).includes('Give it a name to save it.') &&
      (await page.getByLabel('Name', { exact: true }).getAttribute('aria-describedby')) ===
        (await nameError.getAttribute('id')) &&
      (await page.getByLabel('Name', { exact: true }).getAttribute('aria-invalid')) === 'true',
    `${label}: a missing name is said right under the Name field, which is marked and points at it`,
  );
  const saveBox = await page.getByRole('button', { name: 'Save', exact: true }).boundingBox();
  check(
    saveBox !== null && saveBox.y + saveBox.height <= 720 && saveBox.height >= 44,
    `${label}: Save is on the screen in the sticky bar (${JSON.stringify(saveBox)})`,
  );
  check(
    (await page.locator('.editor-bar .hint').innerText()).includes('Check the fields marked above'),
    `${label}: the bar says only that there is something to check`,
  );
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await page.waitForFunction(() => document.querySelector('input.field')?.value === '');
  const left = await page.evaluate(async () => {
    const opened = await globalThis.__culinaStore;
    return (await opened.store.drafts.list()).drafts.length;
  });
  check(left === 0, `${label}: Discard changes removes the draft (${left})`);
};

const reorder = async (page, origin) => {
  const label = '360px editor';
  await open(page, origin, 'components/new');
  await formReady(page);
  await addNewIngredient(page, 'Sugar', '', '20', 0);
  await addNewIngredient(page, 'Butter', '', '30', 1);
  await page.getByRole('button', { name: 'Move down, Line 1, Sugar' }).click();
  check(
    same(
      (await lineValues(page)).map((l) => l[0]),
      ['Butter', 'Sugar'],
    ),
    `${label}: move down reorders without dragging`,
  );
  check(
    await page.evaluate(() => document.activeElement?.getAttribute('data-up') === '1'),
    `${label}: focus follows the moved line to an enabled move button`,
  );
  await page.getByRole('button', { name: 'Move up, Line 2, Sugar' }).click();
  check(
    same(
      (await lineValues(page)).map((l) => l[0]),
      ['Sugar', 'Butter'],
    ),
    `${label}: move up reorders`,
  );
  await page.getByRole('button', { name: 'Remove, Line 1, Sugar' }).click();
  check(
    same(
      (await lineValues(page)).map((l) => l[0]),
      ['Butter'],
    ),
    `${label}: remove drops the line`,
  );
  await page.getByRole('button', { name: 'Discard changes' }).click();
};

export const editor = async (browser, server) => {
  const origin = server.origin;
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, origin);
  const page = await context.newPage();
  let dialogs = 0;
  page.on('dialog', async (d) => {
    dialogs++;
    await d.dismiss();
  });
  const saved = await create(page, origin);
  await reloadEquals(page, origin, saved);
  await deleteUndo(page, origin, saved);
  await cycles(page, origin);
  await drafts(page, origin);
  await reorder(page, origin);
  check(dialogs === 0, 'editor: no confirm dialog anywhere');
  check(
    problems.length === 0,
    `editor: no console errors, CSP violations or foreign requests${problems.length ? ' ' + problems.join('; ') : ''}`,
  );
  await context.close();
};
