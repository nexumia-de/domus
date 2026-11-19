/* global window -- in the function the page runs */
// Opens Chromium for the e2e scripts. Playwright's own browser is used
// unless MIXTURA_CHROMIUM names another binary (the cloud image has a
// browser build older than the pinned Playwright, docs/development.md).
import { chromium } from 'playwright';

export const launch = () =>
  chromium.launch(
    process.env.MIXTURA_CHROMIUM ? { executablePath: process.env.MIXTURA_CHROMIUM } : {},
  );

/**
 * `--throttle=N` on the command line slows the page's CPU N times and
 * `--slow-frames=MS` delays every animation frame by MS, to show races a fast
 * machine hides (a slow CI runner has both).
 */
export const throttle = async (page, args) => {
  const rate = Number(args.find((a) => a.startsWith('--throttle='))?.split('=')[1] ?? 1);
  const frames = Number(args.find((a) => a.startsWith('--slow-frames='))?.split('=')[1] ?? 0);
  if (frames > 0) {
    await page.addInitScript((ms) => {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) =>
        raf(() => setTimeout(() => callback(performance.now()), ms));
    }, frames);
  }
  if (rate > 1) {
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate });
  }
};
