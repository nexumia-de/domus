// Shared by the editor browser checks: opening, reading the form, the store through its test hook.
import { check } from './harness.mjs';
import { overflow, smallTargets } from './measure.mjs';

export const open = async (page, origin, hash) => {
  // A fresh load, like opening the app: nothing is focused until the user navigates.
  await page.goto('about:blank');
  await page.goto(`${origin}/?no-sw&e2e-store#/${hash}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
};

/** Waits until the editor has drawn its form (the draft is read first). */
export const formReady = (page) => page.getByLabel('Name', { exact: true }).waitFor();

export const noFieldFocused = (page) =>
  page.evaluate(
    () => !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName ?? ''),
  );

/** [name, amount, unit] of every line row in the editor. */
export const lineValues = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.component-editor .line-edit')].map((li) => [
      li.querySelector('.pick-name')?.textContent ?? '',
      li.querySelector('input.field').value,
      li.querySelector('select')?.value ?? li.querySelector('.unit-fixed')?.textContent ?? '',
    ]),
  );

export const figures = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.line-figure')].map((n) => n.textContent.trim()),
  );

export const listStore = (page, kind) =>
  page.evaluate(async (k) => {
    const opened = await globalThis.__culinaStore;
    return (await opened.store.list(k)).records;
  }, kind);

export const putStore = (page, kind, record) =>
  page.evaluate(
    async ([k, r]) => {
      const opened = await globalThis.__culinaStore;
      const done = await opened.store.put(k, r);
      return done.ok ? 'ok' : JSON.stringify(done.error);
    },
    [kind, record],
  );

/** Adds one ingredient line through the picker, creating the ingredient inline. */
export const addNewIngredient = async (page, name, role, amount, index) => {
  await page.getByRole('button', { name: 'Add an ingredient' }).click();
  await page.getByLabel('Search your notebook').fill(name);
  await page.getByRole('button', { name: `Add ${name} as a new ingredient` }).click();
  if (role) await page.getByLabel('Role (optional)').fill(role);
  await page.getByRole('button', { name: 'Add ingredient', exact: true }).click();
  await page.locator('.picker').waitFor({ state: 'detached' });
  await page.locator('.line-edit').nth(index).locator('input.field').first().fill(amount);
};

/** Fits 360 px, targets of 44 px, no field focused: the three layout checks of a screen. */
export const layout = async (page, label) => {
  const o = await overflow(page);
  check(
    o.scroll <= 0 && o.wide.length === 0,
    `${label}: fits without horizontal scroll ${JSON.stringify(o)}`,
  );
  const small = await smallTargets(page);
  check(small.length === 0, `${label}: targets at least 44 x 44 ${small.join('; ')}`);
};
