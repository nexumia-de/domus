// Writes the documentation screenshots to docs/screenshots/ (scale 2): `npm run screenshots -w @culina/app`.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp, distDir, launch } from './harness.mjs';
import { serve } from './serve.mjs';

const out = fileURLToPath(new URL('../../../docs/screenshots/', import.meta.url));
// A card with a calculation entered and the comparison open (the longest card: four roles and a range).
const CARD = 'ratios/bread-dough-bakers-percent';
const filled = async (page) => {
  await page.locator('.calc input.field').fill('500');
  await page.getByText('Compare my amounts').click();
  await page.getByLabel('flour (g)').fill('500');
  await page.getByLabel('water (g)').fill('310');
  await page.getByLabel('salt (g)').fill('8');
};
// [file, width, height, colour scheme, route, steps after load, whole page]
const shots = [
  ['ratios-360x720-light.png', 360, 720, 'light', 'ratios'],
  ['ratios-360x720-dark.png', 360, 720, 'dark', 'ratios'],
  ['settings-360x720-light.png', 360, 720, 'light', 'settings'],
  ['ratios-1000x700-light.png', 1000, 700, 'light', 'ratios'],
  ['ratio-list-360x720-light.png', 360, 720, 'light', 'ratios'],
  ['ratio-card-360x720-light.png', 360, 720, 'light', CARD, filled, true],
  ['ratio-card-360x720-dark.png', 360, 720, 'dark', CARD, filled, true],
  ['ratio-card-1000x700-light.png', 1000, 700, 'light', CARD, filled, true],
];

buildApp();
mkdirSync(out, { recursive: true });
const server = await serve(distDir);
const browser = await launch();
for (const [file, width, height, colorScheme, route, steps, fullPage] of shots) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme,
  });
  const page = await context.newPage();
  await page.goto(`${server.url}?no-sw#/${route}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  if (steps) await steps(page);
  await page.screenshot({ path: out + file, fullPage: Boolean(fullPage) });
  console.log(file);
  await context.close();
}
await browser.close();
await server.close();
