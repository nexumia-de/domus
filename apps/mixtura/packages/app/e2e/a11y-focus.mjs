/* global document, getComputedStyle, innerWidth, innerHeight, location, requestAnimationFrame -- in functions the page runs */
// The keyboard half of the accessibility pass: accessible names from the
// browser's accessibility tree, and a walk over the page with Tab.

const NAMED =
  'button|link|textbox|combobox|checkbox|radio|switch|tab|searchbox|slider|spinbutton|menuitem|option|dialog|listbox';

/** Every control and dialog has a name in the accessibility tree. */
export const namelessControls = async (page) => {
  const tree = await page.locator('body').ariaSnapshot();
  const bare = new RegExp(`^\\s*- (${NAMED})(?: \\[[^\\]]+\\])*:?$`);
  return tree
    .split('\n')
    .filter((line) => bare.test(line))
    .map((line) => `no accessible name: ${line.trim()}`);
};

const FOCUSABLE =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';

/**
 * Presses Tab through the page: focus moves on every press, follows the
 * document order, is drawn (outline or shadow), is not hidden behind other
 * content, never gets stuck, and a dialog closes with Escape.
 */
export const focusWalk = async (page) => {
  const out = [];
  await page.evaluate(() => document.activeElement?.blur());
  const expected = await page.evaluate((selector) => {
    const visible = (el) => {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return false;
      for (let e = el; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.display === 'none' || s.visibility === 'hidden' || e.hasAttribute('inert'))
          return false;
      }
      return true;
    };
    const all = [...document.querySelectorAll(selector)].filter(
      (el) => visible(el) && !el.disabled,
    );
    document.querySelectorAll('[tabindex]').forEach((el) => {
      if (Number(el.getAttribute('tabindex')) > 0) all.push(el);
    });
    return all.length;
  }, FOCUSABLE);
  const inDialog = await page.evaluate(() => document.querySelector('[role="dialog"]') !== null);
  const limit = Math.min(expected + 2, 150);
  const path = [];
  let previous = null;
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    const state = await page.evaluate(async () => {
      const el = document.activeElement;
      if (!el || el === document.body) return { body: true };
      // The list loads more rows when this button comes near and the walk is over there.
      if (el.classList.contains('more-button')) return { end: true };
      // Scrolling the focused element into view is animated and slower on a slow
      // device: wait until it is inside the window and stands still.
      const frame = () => new Promise((done) => requestAnimationFrame(() => setTimeout(done, 0)));
      const inside = () => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight;
      };
      const t0 = performance.now();
      for (let was = -1; el && performance.now() - t0 < 8000;) {
        const y = el.getBoundingClientRect().y;
        if (y === was && inside()) break;
        was = y;
        await frame();
      }
      const s = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2;
      const shadow = s.boxShadow !== 'none';
      const x = Math.min(Math.max(box.x + box.width / 2, 0), innerWidth - 1);
      const y = Math.min(Math.max(box.y + box.height / 2, 0), innerHeight - 1);
      let top = document.elementFromPoint(x, y);
      // Focus is moved into view by an animated scroll: it has to be uncovered once that ends.
      for (let n = 0; n < 60 && top && top !== el && !el.contains(top) && !top.contains(el); n++) {
        await new Promise((done) => requestAnimationFrame(() => setTimeout(done, 0)));
        const again = el.getBoundingClientRect();
        top = document.elementFromPoint(
          Math.min(Math.max(again.x + again.width / 2, 0), innerWidth - 1),
          Math.min(Math.max(again.y + again.height / 2, 0), innerHeight - 1),
        );
      }
      const covered = top !== null && top !== el && !el.contains(top) && !top.contains(el);
      return {
        tag: el.tagName,
        name: (el.getAttribute('aria-label') || el.textContent || el.id || '').trim().slice(0, 24),
        drawn: outline || shadow,
        covered,
        coveredBy: top
          ? `${top.tagName}.${top.className} (focused box y=${Math.round(box.y)} h=${Math.round(box.height)}, cover y=${Math.round(top.getBoundingClientRect().y)} h=${Math.round(top.getBoundingClientRect().height)}, viewport ${innerHeight})`
          : '',
        positive: Number(el.getAttribute('tabindex')) > 0,
        index: [...document.querySelectorAll('*')].indexOf(el),
      };
    });
    if (state.end) break;
    if (state.body) {
      path.push('body');
      previous = null;
      continue;
    }
    const who = `${state.tag} "${state.name}"`;
    if (!state.drawn) out.push(`focus not visible on ${who}`);
    if (state.covered) out.push(`focused ${who} is covered by ${state.coveredBy}`);
    if (state.positive) out.push(`positive tabindex on ${who}`);
    if (previous && state.index < previous.index) path.push(`order jump at ${who}`);
    if (previous && state.index === previous.index) out.push(`focus stuck on ${who}`);
    previous = state;
  }
  // Forward order follows the document, except where the walk wrapped around.
  const jumps = path.filter((p) => p.startsWith('order jump'));
  if (jumps.length > 1) out.push(`tab order differs from the document order ${jumps.slice(0, 3)}`);
  if (inDialog) {
    await page.keyboard.press('Escape');
    const closed = await page
      .waitForFunction(() => !document.querySelector('[role="dialog"]'), null, { timeout: 2000 })
      .then(() => true)
      .catch(() => false);
    if (!closed) out.push('Escape does not close the dialog (keyboard trap)');
    else await page.waitForFunction(() => !location.hash.includes('sheet='));
  }
  return out;
};
