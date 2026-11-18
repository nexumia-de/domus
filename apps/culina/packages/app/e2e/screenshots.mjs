// Writes the documentation screenshots to docs/screenshots/ (scale 2): `npm run screenshots -w @culina/app`.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp, distDir, launch } from './harness.mjs';
import { seed } from './seed.mjs';
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
const SAUCE = 'components/example-pan-sauce';
const editorReady = (page) => page.getByLabel('Name', { exact: true }).waitFor();
const picking = async (page) => {
  await editorReady(page);
  await page.getByRole('button', { name: 'Add an ingredient' }).click();
  await page.getByLabel('Search your notebook').fill('Fl');
};
const DOUGH = 'components/example-flat-dough/edit';
const PLATE = 'dishes/example-vegetable-plate/edit';
// [file, width, height, colour scheme, route, steps after load, whole page, with example data]
const shots = [
  ['ratios-360x720-light.png', 360, 720, 'light', 'ratios'],
  ['ratios-360x720-dark.png', 360, 720, 'dark', 'ratios'],
  ['settings-360x720-light.png', 360, 720, 'light', 'settings'],
  ['ratios-1000x700-light.png', 1000, 700, 'light', 'ratios'],
  ['ratio-list-360x720-light.png', 360, 720, 'light', 'ratios'],
  ['ratio-card-360x720-light.png', 360, 720, 'light', CARD, filled, true],
  ['ratio-card-360x720-dark.png', 360, 720, 'dark', CARD, filled, true],
  ['ratio-card-1000x700-light.png', 1000, 700, 'light', CARD, filled, true],
  ['component-360x720-light.png', 360, 720, 'light', SAUCE, undefined, false, true],
  [
    'dish-360x720-light.png',
    360,
    720,
    'light',
    'dishes/example-vegetable-plate',
    undefined,
    false,
    true,
  ],
  [
    'dish-360x720-dark.png',
    360,
    720,
    'dark',
    'dishes/example-vegetable-plate',
    undefined,
    false,
    true,
  ],
  [
    'dish-1000x700-light.png',
    1000,
    700,
    'light',
    'dishes/example-flat-dough-with-sauce',
    undefined,
    false,
    true,
  ],
  ['editor-component-360x720-light.png', 360, 720, 'light', DOUGH, editorReady, true, true],
  ['editor-component-360x720-dark.png', 360, 720, 'dark', DOUGH, editorReady, true, true],
  ['editor-component-1000x700-light.png', 1000, 700, 'light', DOUGH, editorReady, true, true],
  ['editor-picker-360x720-light.png', 360, 720, 'light', 'components/new', picking, false, true],
  ['editor-dish-360x720-light.png', 360, 720, 'light', PLATE, editorReady, true, true],
  ['editor-dish-1000x700-light.png', 1000, 700, 'light', PLATE, editorReady, true, true],
];

buildApp();
mkdirSync(out, { recursive: true });
const server = await serve(distDir);
const browser = await launch();
for (const [file, width, height, colorScheme, route, steps, fullPage, withExamples] of shots) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme,
  });
  const page = await context.newPage();
  if (withExamples) await seed(page, server.url);
  await page.goto('about:blank');
  await page.goto(`${server.url}?no-sw#/${route}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  if (steps) await steps(page);
  await page.screenshot({ path: out + file, fullPage: Boolean(fullPage) });
  console.log(file);
  await context.close();
}
await browser.close();
await server.close();
