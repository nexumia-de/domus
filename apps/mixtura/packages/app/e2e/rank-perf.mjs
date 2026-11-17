/* global window, document, location, MutationObserver, requestAnimationFrame -- in functions the page runs */
// What the Buy Next ranking costs the main thread (issue #84): stocks gin
// and light rum, then taps "Have it" on eight candidates in a row and
// prints the medians and worst cases, plus the cold load of the screen.
// Run it on the built app (`DIST=other/dir` for another build) with the CPU
// slowed 4 times, a phone stand-in:
//
//   node e2e/rank-perf.mjs [rate]
import { resolve } from 'node:path';
import { launch, throttle } from './browser.mjs';
import { serve } from './serve.mjs';
const rate = Number(process.argv[2] ?? 4);
const site = await serve(resolve(process.env.DIST ?? 'dist'));
const b = await launch();
const p = await (await b.newContext({ viewport: { width: 360, height: 720 } })).newPage();
await throttle(p, [`--throttle=${rate}`]);
await p.goto(site.url + '#/stock');
await p.locator('.stock-tree').waitFor();
for (const name of ['gin', 'light rum']) {
  const input = p.locator('input[name="q"]');
  await input.fill(name);
  await p.waitForFunction(() => location.hash.includes('q='));
  await p.locator('.stock-row').first().waitFor();
  await input.press('Enter');
  await p.waitForTimeout(300);
}
await p.addInitScript(() => {
  window.__lt = [];
  new PerformanceObserver((l) =>
    window.__lt.push(...l.getEntries().map((e) => e.duration)),
  ).observe({ entryTypes: ['longtask'] });
  new MutationObserver((_, o) => {
    if (document.querySelector('.buy-item')) {
      window.__first = performance.now();
      o.disconnect();
    }
  }).observe(document, { subtree: true, childList: true });
});
await p.goto('about:blank');
await p.goto(site.url + '#/stock/buy-next');
await p.locator('.buy-item').first().waitFor();
console.log(
  'cold load: first candidates at',
  Math.round(await p.evaluate(() => window.__first)),
  'ms, long tasks',
  (await p.evaluate(() => window.__lt)).map(Math.round).join(),
);
const out = [];
for (let i = 0; i < 8; i++) {
  out.push(
    await p.evaluate(async () => {
      const lt = [];
      const o = new PerformanceObserver((l) => lt.push(...l.getEntries().map((e) => e.duration)));
      o.observe({ entryTypes: ['longtask'] });
      const first = () => document.querySelector('.buy-item .row-title')?.textContent;
      const was = first();
      const t0 = performance.now();
      document.querySelector('.buy-have').click();
      await new Promise((d) => requestAnimationFrame(() => setTimeout(d, 0)));
      const frame = performance.now() - t0;
      while (first() === was) await new Promise((d) => requestAnimationFrame(d));
      const drawn = performance.now() - t0;
      await new Promise((d) => setTimeout(d, 150));
      o.disconnect();
      return { frame, drawn, longest: Math.max(0, ...lt) };
    }),
  );
}
const med = (k) =>
  Math.round([...out.map((r) => r[k])].sort((a, b) => a - b)[Math.floor(out.length / 2)]);
console.log(
  `rate ${rate}: tap->next frame median ${med('frame')} ms (max ${Math.round(Math.max(...out.map((r) => r.frame)))}), ranking drawn median ${med('drawn')} ms (max ${Math.round(Math.max(...out.map((r) => r.drawn)))}), longest task max ${Math.round(Math.max(...out.map((r) => r.longest)))} ms`,
);
await b.close();
await site.close();
