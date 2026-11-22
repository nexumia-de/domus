// Draws the PNG icons from the SVGs with Playwright's Chromium:
// `npm run icons -w @emptio/app`. The PNGs are committed; run this only when
// an SVG changes.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const assets = new URL('../src/assets/', import.meta.url);
const jobs = [
  { from: 'icon.svg', to: 'icon-192.png', size: 192 },
  { from: 'icon.svg', to: 'icon-512.png', size: 512 },
  { from: 'icon-maskable.svg', to: 'icon-maskable-512.png', size: 512 },
];

// PLAYWRIGHT_CHROMIUM_PATH names a Chromium that is already installed, as in the sister apps.
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage();
for (const { from, to, size } of jobs) {
  const svg = readFileSync(new URL(from, assets), 'utf8').replace(
    '<svg ',
    `<svg width="${size}" height="${size}" `,
  );
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`);
  writeFileSync(new URL(to, assets), await page.screenshot({ omitBackground: true }));
  console.log(`${to}: ${size} px`);
}
await browser.close();
