// Rasterises the SVG icons to PNG with Playwright's Chromium: `npm run icons -w @culina/app`.
// The PNGs are committed; run this only when an SVG changes.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const assets = new URL('../src/assets/', import.meta.url);
const jobs = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512],
];

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage();
for (const [source, target, size] of jobs) {
  const svg = readFileSync(new URL(source, assets), 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`,
  );
  writeFileSync(new URL(target, assets), await page.screenshot({ omitBackground: true }));
  console.log(`${target} ${size}x${size}`);
}
await browser.close();
