// Stage 1b of a run: the toast (short, in the colours of the theme, above the add field, Undo)
// and what the list shows and in which order (filter by urgency, four sorts, kept on the device).
// Runs on the entries of the list stage and leaves them as it found them.
import { ok, rows, said, showAll } from './driver.mjs';

const names = async (page) => (await rows(page)).filter((r) => !r.bought).map((r) => r.name);

async function addFast(page, t, name, priority) {
  const form = page.locator('.add-form');
  const field = form.getByLabel(t.list.addLabel, { exact: true });
  await field.fill(name);
  if (priority) await form.locator(`.chip-${priority}`).click();
  await field.press('Enter');
  await said(page, name);
}

export async function toastStage(run, { page }) {
  const { t, server } = run;
  await page.goto(`${server.origin}/#/`);
  await page.waitForSelector('.entry');
  const before = (await rows(page)).length;
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    await addFast(page, t, `Tea ${scheme}`);
    await ok(run, `toast (${scheme}): theme colours from the tokens, not a white bar`, () =>
      page.evaluate(() => {
        const toast = document.querySelector('.fr-toast');
        const probe = document.createElement('div');
        probe.style.cssText = 'background: var(--surface-2); color: var(--text)';
        document.body.append(probe);
        const want = getComputedStyle(probe);
        const got = getComputedStyle(toast);
        const same = got.backgroundColor === want.backgroundColor && got.color === want.color;
        probe.remove();
        return same;
      }),
    );
    await ok(
      run,
      `toast (${scheme}): above the add field, the field is the only thing docked`,
      () =>
        page.evaluate(() => {
          const toast = document.querySelector('.fr-toast').getBoundingClientRect();
          const dock = document.querySelector('.app-dock');
          return (
            toast.height > 0 &&
            toast.bottom <= dock.getBoundingClientRect().top + 0.5 &&
            dock.children.length === 1 &&
            dock.children[0].classList.contains('add-form') &&
            !dock.contains(document.querySelector('.fr-toast'))
          );
        }),
    );
  }
  await page.emulateMedia({ colorScheme: null });
  await ok(
    run,
    'toast: offers Undo with a target of 44 px; Undo removes what was added',
    async () => {
      await addFast(page, t, 'Tea undo');
      const undo = page
        .locator('.fr-toast')
        .getByRole('button', { name: t.list.undo, exact: true });
      if ((await undo.boundingBox()).height < 43.99) return false;
      await undo.click();
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('.entry-name')].some((n) =>
            n.textContent.includes('Tea undo'),
          ),
      );
      return (await page.locator('.fr-toast').innerText()) === '';
    },
  );
  await ok(run, 'toast: it goes by itself after about 3 s (no Undo used)', async () => {
    await addFast(page, t, 'Tea gone');
    const start = Date.now();
    await page.waitForFunction(
      () => document.querySelector('.fr-toast')?.textContent === '',
      null,
      {
        timeout: 8_000,
      },
    );
    const seconds = (Date.now() - start) / 1000;
    return seconds >= 2 && seconds <= 6;
  });
  // Put the list back as it was.
  for (const tea of await page.locator('.entry', { hasText: 'Tea' }).all()) {
    await tea.locator('.tick').click();
  }
  await page.waitForFunction(
    () => !document.querySelector('.entry:not(.entry-bought)')?.textContent.includes('Tea'),
  );
  await ok(
    run,
    'toast: the entries added for the checks are only ticked',
    async () => (await rows(page)).length >= before,
  );
}

export async function viewStage(run, { page }) {
  const { t, server } = run;
  await page.goto(`${server.origin}/#/`);
  await page.waitForSelector('.entry');
  await addFast(page, t, 'Apples', 'soon');
  await addFast(page, t, 'Candles', 'sometime');
  const chip = (step) => page.locator('.filter-chip', { hasText: t.priority[step] });
  const sort = page.getByLabel(t.list.sortLabel, { exact: true });

  await ok(
    run,
    'filter: by default Now and Soon are shown, Sometime is hidden but counted',
    async () => {
      const open = await names(page);
      return (
        open.includes('Milk') &&
        open.includes('Apples') &&
        !open.includes('Candles') &&
        (await chip('sometime').getAttribute('aria-pressed')) === 'false' &&
        (await chip('now').getAttribute('aria-pressed')) === 'true' &&
        (await chip('sometime').locator('.filter-count').innerText()) === '1' &&
        (await page.locator('.more-line button').innerText()) === t.list.moreSometime(1)
      );
    },
  );
  await ok(
    run,
    'filter: "Show 1 more for Sometime" shows them and the choice survives a reload',
    async () => {
      await page.locator('.more-line button').click();
      const shown = (await names(page)).includes('Candles');
      await page.reload();
      await page.waitForSelector('.entry');
      return (
        shown &&
        (await names(page)).includes('Candles') &&
        (await chip('sometime').getAttribute('aria-pressed')) === 'true' &&
        (await page.locator('.more-line').count()) === 0
      );
    },
  );
  await ok(run, 'filter: Now can be switched off and on; each urgency alone', async () => {
    await chip('now').click();
    const noNow = !(await names(page)).includes('Milk') && (await names(page)).includes('Apples');
    await chip('soon').click();
    const onlySometime = (await names(page)).join('|') === 'Candles';
    await chip('now').click();
    await chip('soon').click();
    const back = (await names(page)).includes('Milk') && (await names(page)).includes('Apples');
    await chip('sometime').click();
    const onlyNowSoon =
      !(await names(page)).includes('Candles') && (await names(page)).includes('Milk');
    await chip('sometime').click();
    return noNow && onlySometime && back && onlyNowSoon;
  });
  await ok(run, 'filter: nothing shown says so, and the chips can bring it back', async () => {
    for (const step of ['now', 'soon', 'sometime']) await chip(step).click();
    const empty = (await page.locator('.empty').innerText()).includes(t.list.nothingShown);
    await showAll(page);
    return empty && (await names(page)).length >= 3;
  });

  await ok(run, 'sort: store order is the default and groups by urgency and category', async () => {
    const titles = await page.locator('.step-title').allInnerTexts();
    return (
      (await sort.inputValue()) === 'store' &&
      titles.slice(0, 3).join('|') ===
        `${t.priority.now}|${t.priority.soon}|${t.priority.sometime}` &&
      (await page.locator('.category-title').count()) > 0
    );
  });
  await sort.selectOption('urgency');
  await ok(
    run,
    'sort: urgency groups by urgency without category headings, then by name',
    async () => {
      const open = await names(page);
      return (
        (await page.locator('.category-title').count()) === 0 &&
        open[0] === 'Milk' &&
        open.indexOf('Apples') < open.indexOf('Bread') &&
        open.at(-1) === 'Candles'
      );
    },
  );
  await sort.selectOption('name');
  await ok(
    run,
    'sort: name is one flat list from A to Z with the urgency on each row',
    async () => {
      const open = await names(page);
      const sorted = [...open].sort((a, b) => a.localeCompare(b, 'en'));
      return (
        open.join('|') === sorted.join('|') &&
        (await page.locator('.step-now, .step-soon, .step-sometime').count()) === 0 &&
        (await page.locator('.entry:not(.entry-bought) .entry-prio').count()) === open.length
      );
    },
  );
  await sort.selectOption('added');
  await ok(run, 'sort: recently added puts the newest first', async () => {
    const open = await names(page);
    return open[0] === 'Candles' && open[1] === 'Apples';
  });
  await page.reload();
  await page.waitForSelector('.entry');
  await ok(
    run,
    'sort: the choice is kept on this device over a reload',
    async () => (await sort.inputValue()) === 'added' && (await names(page))[0] === 'Candles',
  );
  await sort.selectOption('store');
  await ok(
    run,
    'sort: switching back restores rule 1',
    async () =>
      (await page.locator('.category-title').count()) > 0 && (await names(page)).includes('Milk'),
  );
  // The checks' own entries are ticked again; the view stays with every urgency shown.
  for (const name of ['Apples', 'Candles']) {
    await page.locator('.entry', { hasText: name }).locator('.tick').click();
    await page.waitForFunction(
      (n) => !(document.querySelector('.step-soon, .step-sometime')?.textContent ?? '').includes(n),
      name,
    );
  }
}
