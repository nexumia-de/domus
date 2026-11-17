/* global document, getComputedStyle, innerWidth -- in functions the page runs */
// Reflow and text size (WCAG 2.2 SC 1.4.4 and 1.4.10, docs/design.md): on
// every route the page does not scroll sideways and no essential text is cut
// off, with the text at 200 % at the phone's 360 px, and at 320 px wide with
// the text at 100 % and at 200 %.
//
//   node e2e/reflow.mjs
import { launch } from './browser.mjs';
import { expect, serve } from './serve.mjs';

const routes = [
  ['drinks', '#/drinks'],
  ['drinks-filters', '#/drinks?sheet=filters'],
  ['spec', '#/drinks/daiquiri'],
  ['spec-batch', '#/drinks/daiquiri?sheet=batch'],
  ['swap', '#/drinks/daiquiri?swap='],
  ['swap-sheet', '#/drinks/daiquiri?swap=&sheet=line-0'],
  ['editor', '#/drinks/new'],
  ['versions', '#/drinks/daiquiri/versions'],
  ['family', '#/drinks/daiquiri/family'],
  ['templates', '#/templates'],
  ['template', '#/templates/daiquiri'],
  ['stock', '#/stock'],
  ['buy-next', '#/stock/buy-next'],
  ['settings', '#/settings'],
  ['data', '#/settings/data'],
  ['about', '#/about'],
  ['not-found', '#/nowhere'],
];
const sizes = [
  ['360 px, text 200 %', 360, 720, true],
  ['320 px, text 100 %', 320, 640, false],
  ['320 px, text 200 %', 320, 640, true],
];

/** Sideways scrolling, and titles and navigation labels cut off. */
const findings = () => {
  const out = [];
  const root = document.scrollingElement;
  if (root.scrollWidth > root.clientWidth) out.push(`page ${root.scrollWidth}>${root.clientWidth}`);
  for (const el of document.querySelectorAll('.pane-scroll, .sheet-scroll, .nav, body')) {
    if (el.scrollWidth > el.clientWidth + 1)
      out.push(`${el.tagName}.${el.className} ${el.scrollWidth}>${el.clientWidth}`);
  }
  const wide = [...document.querySelectorAll('body *')].filter((el) => {
    const r = el.getBoundingClientRect();
    const box = el.closest('.pane-scroll, .sheet-scroll')?.getBoundingClientRect();
    const edge = box ? box.right : innerWidth;
    return r.width > 0 && r.right > edge + 1 && getComputedStyle(el).position !== 'fixed';
  });
  for (const el of wide.slice(0, 4))
    out.push(`${el.tagName}.${el.className} right=${Math.round(el.getBoundingClientRect().right)}`);
  const cut = [
    ...document.querySelectorAll(
      'h1, h2, h3, .nav *, button, [role="tab"], label, .row-title, .row-sub, .line-ingredient-name, .tag',
    ),
  ]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || el.children.length > 0 || !el.textContent.trim()) return false;
      const s = getComputedStyle(el);
      const clips = s.overflow !== 'visible' || s.overflowX !== 'visible';
      return (
        (clips && el.scrollWidth > el.clientWidth + 1) ||
        (clips && el.scrollHeight > el.clientHeight + 1)
      );
    })
    .slice(0, 6);
  for (const el of cut)
    out.push(`cut off ${el.tagName}.${el.className} "${el.textContent.trim().slice(0, 30)}"`);
  return out;
};

const site = await serve();
const browser = await launch();
const problems = [];
for (const [label, width, height, text] of sizes) {
  const context = await browser.newContext({ viewport: { width, height }, bypassCSP: true });
  const page = await context.newPage();
  page.on('pageerror', (error) => {
    throw error;
  });
  for (const [name, address] of routes) {
    await page.goto('about:blank');
    await page.goto(`${site.url}${address}`, { waitUntil: 'load' });
    await page.locator('.pane h1:visible').last().waitFor({ timeout: 5000 });
    if (text) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await page.waitForTimeout(400);
    for (const finding of await page.evaluate(findings))
      problems.push(`${label} ${name}: ${finding}`);
  }
  await context.close();
}
if (problems.length > 0) console.log(problems.join('\n'));
expect(
  problems.length === 0,
  `no sideways scrolling or cut-off text on ${routes.length} routes x ${sizes.length} sizes`,
);
await browser.close();
await site.close();
