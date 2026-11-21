// What every stage of the checks does on a page: wait for the app, add, read the rows, read the
// live line. A check that throws (a wait that timed out) is a failed check, not an aborted run.
import { check } from '@nexumia-de/hospes/testing/browser';

/** Runs one check; a thrown error (a timeout) fails it with the first line of the message. */
export async function ok(run, what, fn) {
  try {
    check(Boolean(await fn()), `${run.label}: ${what}`);
  } catch (error) {
    check(false, `${run.label}: ${what} (${String(error.message).split('\n')[0]})`);
  }
}

/** Opens the app and waits until the list has been read. */
export async function openApp(page, origin, hash = '') {
  await page.goto(`${origin}/${hash}`);
  await page.waitForFunction(() =>
    document.querySelector('.space-line .space-name, .space-line select'),
  );
}

/** Waits until the live line says `text`. */
export const said = (page, text) =>
  page.waitForFunction(
    (wanted) => document.querySelector('.live')?.textContent.includes(wanted),
    text,
  );

/** The entries on the list screen, in the order of the page. */
export const rows = (page) =>
  page.$$eval('.entry', (nodes) =>
    nodes.map((node) => ({
      id: node.dataset.entry,
      name: node.querySelector('.entry-name').firstChild.textContent,
      amount: node.querySelector('.entry-amount')?.textContent ?? '',
      bought: node.classList.contains('entry-bought'),
    })),
  );

export const rowOf = (page, name) =>
  page.locator('.entry', { has: page.locator('.entry-name', { hasText: name }) });

/** Adds an entry on the list screen by Enter or by the button. */
export async function add(page, t, name, { amount, priority, button = false } = {}) {
  const form = page.locator('.add-form');
  // Priority and amount show once there is a name.
  const field = form.getByLabel(t.list.addLabel, { exact: true });
  await field.fill(name);
  if (priority) await form.locator(`.chip-${priority}`).click();
  if (amount) await form.getByLabel(t.list.amountLabel, { exact: true }).fill(amount);
  if (button) await form.getByRole('button', { name: t.list.add, exact: true }).click();
  else await field.press('Enter');
  await said(page, name.trim());
}

/** Goes to a screen by the link of the header (or the back link). */
export async function goTo(page, hash, heading) {
  await page.locator(`a[href="${hash}"]`).first().click();
  await page.waitForFunction((h) => document.querySelector('h1')?.textContent === h, heading);
}

/** Tab through the page: which visible controls did the keyboard never reach? */
export async function unreachedByTab(page) {
  await page.evaluate(() => {
    window.__seen = new Set();
    document.addEventListener('focusin', (e) => window.__seen.add(e.target));
  });
  await page.evaluate(() => document.activeElement?.blur());
  const count = await page.evaluate(
    () => document.querySelectorAll('a[href], button, input, select, textarea').length,
  );
  for (let i = 0; i < count + 3; i += 1) await page.keyboard.press('Tab');
  return page.evaluate(() => {
    const out = [];
    const groups = new Set([...window.__seen].filter((n) => n.type === 'radio').map((n) => n.name));
    for (const node of document.querySelectorAll('a[href], button, input, select, textarea')) {
      const box = node.getBoundingClientRect();
      if (box.width === 0 || node.disabled) continue;
      // A radio group is one stop of the keyboard; the arrow keys move inside it.
      if (node.type === 'radio' ? groups.has(node.name) : window.__seen.has(node)) continue;
      out.push(
        `${node.tagName.toLowerCase()} ${node.textContent.trim() || node.name || node.className}`,
      );
    }
    return out;
  });
}

/**
 * Like the shared `audit`, except that a radio button counts by its label (a chip is tapped on
 * its label, whatever the size of the dot), the way the shared audit already counts a checkbox
 * inside a label. A tick box without a label is its own tap target.
 */
export const tapAudit = (page) =>
  page.evaluate(() => {
    const small = [];
    for (const node of document.querySelectorAll(
      'a[href], button, input:not([type=hidden]), select, textarea, summary',
    )) {
      const own = node.getBoundingClientRect();
      if (own.width === 0 || own.height === 0 || getComputedStyle(node).visibility === 'hidden')
        continue;
      const target = node.type === 'radio' ? (node.closest('label') ?? node) : node;
      const box = target.getBoundingClientRect();
      if (box.height < 43.99 || box.width < 43.99) {
        const name = node.textContent || node.getAttribute('aria-label') || node.name || node.id;
        small.push(
          `${node.tagName.toLowerCase()} "${name.trim().slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`,
        );
      }
    }
    const root = document.documentElement;
    return {
      small,
      overflow: Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth,
    };
  });
