// Meal prep in a browser: a component says how long it keeps per storage place; "Made it" puts a
// batch into stock, made today; choosing where it lies derives its use-by date from the component.
import { check, watch } from './harness.mjs';
import { addNewIngredient, formReady, layout, listStore, open } from './editor-helpers.mjs';
import { stockItems } from './stock-helpers.mjs';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NAME = 'Prep sauce';
const row = (page, n) => page.locator('.keep-row').nth(n - 1);

const keeps = async (page, origin) => {
  const label = '360px meal prep';
  await open(page, origin, 'components/new');
  await formReady(page);
  await page.getByLabel('Name', { exact: true }).fill(NAME);
  await addNewIngredient(page, 'Tomato', '', '800', 0);
  check(
    (await page.getByRole('heading', { level: 2, name: 'Keeps' }).count()) === 1 &&
      (await page.locator('.keep-row').count()) === 0,
    `${label}: the editor has a Keeps section, empty at first`,
  );
  await page.getByRole('button', { name: 'Add a storage place' }).click();
  check(
    (await row(page, 1).getByLabel('Storage place').inputValue()) === 'fridge',
    `${label}: the first storage place offered is the fridge`,
  );
  await row(page, 1).getByLabel('Days').fill('3');
  await row(page, 1).getByLabel('How (optional)').fill('airtight');
  await page.getByRole('button', { name: 'Add a storage place' }).click();
  check(
    (await row(page, 2).getByLabel('Storage place').inputValue()) === 'freezer',
    `${label}: the next one is a place not used yet`,
  );
  await row(page, 2).getByLabel('Days').fill('90');
  await page.getByRole('button', { name: 'Add a storage place' }).click();
  await layout(page, `${label} (three storage rows)`);

  // Days are whole numbers: an empty row is named at its field.
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  check(
    (await row(page, 3).locator('.field-error').innerText()) ===
      'Storage 3: give whole days, and each storage place once, to save it.',
    `${label}: a row without days is named at the row`,
  );
  await page.getByRole('button', { name: 'Remove storage 3' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('heading', { level: 1, name: NAME }).waitFor();
  check(
    same(await page.locator('.keeps-list li').allInnerTexts(), [
      'Fridge: 3 days · airtight',
      'Freezer: 90 days',
    ]),
    `${label}: the component says how long it keeps (${(await page.locator('.keeps-list li').allInnerTexts()).join(' | ')})`,
  );
  const stored = (await listStore(page, 'components')).find((c) => c.name === NAME);
  check(
    same(stored?.keeps, [
      { storage: 'fridge', days: 3, source: 'user', note: 'airtight' },
      { storage: 'freezer', days: 90, source: 'user' },
    ]),
    `${label}: the entries are stored with the source "user" (${JSON.stringify(stored?.keeps)})`,
  );
  await layout(page, `${label} (component with keeps)`);
  return stored?.id;
};

const intoStock = async (page, componentId) => {
  const label = '360px meal prep stock';
  const today = await page.evaluate(() => {
    const d = new Date();
    const two = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
  });
  await page.getByRole('button', { name: 'Made it: put it in stock' }).click();
  // The component's page has the same heading, so the address is what shows the change.
  await page.waitForURL(/#\/stock\/[^/]+\/edit$/);
  await page.getByLabel('Date prepared').waitFor();
  check(/#\/stock\/[^/]+\/edit$/.test(page.url()), `${label}: "Made it" opens the new stock item`);
  check(
    (await page.getByLabel('Date prepared').inputValue()) === today &&
      (await page.getByLabel('State').inputValue()) === 'prepared',
    `${label}: made today, prepared`,
  );
  check(
    (await page.locator('.stock-suggest button').count()) === 2,
    `${label}: without a place, both places of the component are offered`,
  );
  await page.getByLabel('Where it lies').selectOption('freezer');
  check(
    (await page.locator('.stock-suggest button').count()) === 1,
    `${label}: with its place, only that one is offered`,
  );
  const derived = await page
    .locator('.stock-form .note-quiet')
    .filter({ hasText: /^Use by / })
    .innerText();
  check(
    /^Use by .+, from the recorded shelf life\.$/.test(derived),
    `${label}: the use-by date is derived from the component (${derived})`,
  );
  await layout(page, `${label} (stock item of a component)`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.locator('.stock-rows').waitFor();
  const names = await page.locator('.stock-rows .stock-link .entry-name').allTextContents();
  check(same(names, [NAME]), `${label}: the batch is in the stock list (${names.join(', ')})`);
  const [item] = await stockItems(page);
  check(
    same(
      { ...item, id: undefined },
      {
        ref: { kind: 'component', id: componentId },
        state: 'prepared',
        preparedOn: today,
        storage: 'freezer',
      },
    ),
    `${label}: stored with its place and date, and no use-by date written (${JSON.stringify(item)})`,
  );
  const text = await page.locator('.stock-rows li').first().innerText();
  check(
    /\d+ days left/.test(text),
    `${label}: the list counts the days left (${text.replace(/\n/g, ' | ')})`,
  );
};

export const mealPrep = async (browser, server) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const problems = watch(context, server.origin);
  const page = await context.newPage();
  const id = await keeps(page, server.origin);
  await intoStock(page, id);
  check(
    problems.length === 0,
    `360px meal prep: no console errors or foreign requests ${problems.join('; ')}`,
  );
  await context.close();
};
