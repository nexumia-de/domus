// Writes the documentation screenshots to docs/screenshots/ (scale 2): `npm run screenshots -w @culina/app`;
// `npm run screenshots -w @culina/app -- <text>` writes only the files whose name contains the text.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { store as storeCookFixture } from './cook-fixture.mjs';
import { content as classicsContent, PAN } from './classics-fixture.mjs';
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
const SHIPPED = 'components/oeufs-a-la-neige.snow-eggs';
const shippedListed = (page) => page.locator('.notebook-row-shipped').first().waitFor();
const editorReady = (page) => page.getByLabel('Name', { exact: true }).waitFor();
const picking = async (page) => {
  await editorReady(page);
  await page.getByRole('button', { name: 'Add an ingredient' }).click();
  await page.getByLabel('Search your notebook').fill('Fl');
};
const DOUGH = 'components/example-flat-dough/edit';
const PLATE = 'dishes/example-vegetable-plate/edit';
const HISTORY = 'components/example-herb-oil/history';
const OLD = 'components/example-herb-oil';
const historyReady = (page) => page.locator('.history-entry').first().waitFor();
const oldReady = (page) => page.locator('.older-version').waitFor();
// An export file with one record that differs from the example data and one that may be here already.
const EXPORT_FILE = JSON.stringify({
  format: 'culina-export',
  formatVersion: 1,
  exportedAt: '2026-11-18T08:00:00Z',
  ingredients: [
    { id: 'flour', name: 'Strong flour' },
    { id: 'u-00000000-0000-4000-8000-000000000077', name: 'Rye flour' },
  ],
});
const COOK_FILE = `---
title: Imported sauce
yield: 400%g
---

Mix @flour{200%g} and @butter{1/2%cup} in a #pot{}.

Add @saffron{1%pinch}, @salt and @flour{1%tbsp}.

> Taste before serving.
`;
const importing = (name, content, ready) => async (page) => {
  await page
    .locator('input[type=file]')
    .setInputFiles({ name, mimeType: 'text/plain', buffer: Buffer.from(content) });
  await page.getByText(ready, { exact: true }).waitFor();
};
const IMPORT_JSON = importing('export.json', EXPORT_FILE, 'Records that differ');
const IMPORT_COOK = importing('sauce.cook', COOK_FILE, 'Complete the recipe');
// A file with sections: it becomes a dish of one component per section (issue 41).
const SECTIONS_FILE = `---
title: Pasta with tomato sauce
servings: 2
---

Bring salted water to the boil.

= Pasta

Cook @pasta{200%g} in @water{2%l} with @salt{10%g}.

= Sauce

Soften @onion{1} in @butter{20%g}, add @tomatoes{400%g} and simmer.

= Serving

Toss the pasta in the sauce.
`;
const IMPORT_SECTIONS = importing('pasta.cook', SECTIONS_FILE, 'Complete the recipe');
// Stock: items written through the store's test hook, then the page is read again.
const STOCK_NOW = '&e2e-store&e2e-now=2026-11-18T08:00:00Z';
const stockItems = [
  {
    id: 'u-s1',
    ref: { kind: 'ingredient', id: 'onion' },
    amount: { value: 500, unit: 'g' },
    state: 'raw',
    preparedOn: '2026-11-17',
    useBy: '2026-11-20',
  },
  { id: 'u-s2', ref: { kind: 'ingredient', id: 'carrot' }, always: true },
  { id: 'u-s3', ref: { kind: 'ingredient', id: 'salt' }, always: true },
  {
    id: 'u-s4',
    ref: { kind: 'ingredient', id: 'butter' },
    amount: { value: 250, unit: 'g' },
    useBy: '2026-11-17',
  },
  {
    id: 'u-s5',
    ref: { kind: 'component', id: 'example-vegetable-stock' },
    amount: { value: 400, unit: 'g' },
    state: 'prepared',
    preparedOn: '2026-11-16',
    useBy: '2026-11-19',
  },
  { id: 'u-s6', ref: { kind: 'ingredient', id: 'flour' } },
];
const stocked = async (page) => {
  // Stock is the shared collection of a space: written through the stock test hook.
  // An `id` is not written: the hook keeps only the item's detail.
  await page.evaluate((items) => globalThis.__culinaStock.add(items), stockItems);
  await page.reload();
  await page.getByRole('heading', { level: 1 }).waitFor();
};
// Cook and the finder: the fixture notebook and stock of e2e/cook.mjs, written through the store's
// test hook.
const cooked = async (page) => {
  await storeCookFixture(page);
  await page.reload();
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.locator('.cook-screen').waitFor();
};
const haveOn = async (page) => {
  await cooked(page);
  await page.getByLabel('Only with what I have').check();
};
const LATER = `&e2e-now=${new Date(Date.now() + 40 * 86_400_000).toISOString()}`;
// [file, width, height, colour scheme, route, steps after load, whole page, with example data, extra query]
const shots = [
  ['ratios-360x720-light.png', 360, 720, 'light', 'ratios'],
  ['ratios-360x720-dark.png', 360, 720, 'dark', 'ratios'],
  ['settings-360x720-light.png', 360, 720, 'light', 'settings', undefined, true],
  ['settings-1000x700-light.png', 1000, 700, 'light', 'settings', undefined, true],
  ['import-merge-360x720-light.png', 360, 720, 'light', 'settings/import', IMPORT_JSON, true, true],
  [
    'import-merge-1000x700-light.png',
    1000,
    700,
    'light',
    'settings/import',
    IMPORT_JSON,
    true,
    true,
  ],
  [
    'import-cooklang-360x720-light.png',
    360,
    720,
    'light',
    'settings/import',
    IMPORT_COOK,
    true,
    true,
  ],
  [
    'import-cooklang-360x720-dark.png',
    360,
    720,
    'dark',
    'settings/import',
    IMPORT_COOK,
    true,
    true,
  ],
  [
    'import-cooklang-1000x700-light.png',
    1000,
    700,
    'light',
    'settings/import',
    IMPORT_COOK,
    true,
    true,
  ],
  [
    'import-cooklang-sections-360x720-light.png',
    360,
    720,
    'light',
    'settings/import',
    IMPORT_SECTIONS,
    true,
    true,
  ],
  [
    'import-cooklang-sections-1000x700-light.png',
    1000,
    700,
    'light',
    'settings/import',
    IMPORT_SECTIONS,
    true,
    true,
  ],
  ['backup-banner-360x720-light.png', 360, 720, 'light', 'ratios', undefined, false, true, LATER],
  ['ratios-1000x700-light.png', 1000, 700, 'light', 'ratios'],
  ['ratio-list-360x720-light.png', 360, 720, 'light', 'ratios'],
  ['ratio-card-360x720-light.png', 360, 720, 'light', CARD, filled, true],
  ['ratio-card-360x720-dark.png', 360, 720, 'dark', CARD, filled, true],
  ['ratio-card-1000x700-light.png', 1000, 700, 'light', CARD, filled, true],
  ['component-360x720-light.png', 360, 720, 'light', SAUCE, undefined, false, true],
  // The list with the shipped components (the real shipped content) and one of them, read-only.
  [
    'components-list-360x720-light.png',
    360,
    720,
    'light',
    'components',
    shippedListed,
    false,
    true,
  ],
  [
    'components-list-1000x700-light.png',
    1000,
    700,
    'light',
    'components',
    shippedListed,
    false,
    true,
  ],
  // The Notebook's Dishes: own and shipped dishes in one plain list.
  ['dishes-list-360x720-light.png', 360, 720, 'light', 'dishes', shippedListed, false, true],
  ['dishes-list-1000x700-light.png', 1000, 700, 'light', 'dishes', shippedListed, false, true],
  ['component-shipped-360x720-light.png', 360, 720, 'light', SHIPPED, undefined, true, true],
  ['component-shipped-1000x700-light.png', 1000, 700, 'light', SHIPPED, undefined, false, true],
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
  ['history-360x720-light.png', 360, 720, 'light', HISTORY, historyReady, true, true],
  ['history-360x720-dark.png', 360, 720, 'dark', HISTORY, historyReady, true, true],
  ['history-1000x700-light.png', 1000, 700, 'light', HISTORY, historyReady, true, true],
  ['version-old-360x720-light.png', 360, 720, 'light', OLD, oldReady, false, true],
  ['version-old-1000x700-light.png', 1000, 700, 'light', OLD, oldReady, false, true],
  ['stock-360x720-light.png', 360, 720, 'light', 'stock', stocked, true, true, STOCK_NOW],
  ['stock-360x720-dark.png', 360, 720, 'dark', 'stock', stocked, true, true, STOCK_NOW],
  ['stock-1000x700-light.png', 1000, 700, 'light', 'stock', stocked, true, true, STOCK_NOW],
  ['stock-add-360x720-light.png', 360, 720, 'light', 'stock/add', stocked, false, true, STOCK_NOW],
  [
    'stock-add-1000x700-light.png',
    1000,
    700,
    'light',
    'stock/add',
    stocked,
    false,
    true,
    STOCK_NOW,
  ],
  [
    'stock-item-360x720-light.png',
    360,
    720,
    'light',
    'stock/u-s1/edit',
    stocked,
    true,
    true,
    STOCK_NOW,
  ],
  [
    'stock-item-1000x700-light.png',
    1000,
    700,
    'light',
    'stock/u-s1/edit',
    stocked,
    true,
    true,
    STOCK_NOW,
  ],
  ['cook-360x720-light.png', 360, 720, 'light', 'cook', cooked, true, false, STOCK_NOW],
  ['cook-360x720-dark.png', 360, 720, 'dark', 'cook', cooked, true, false, STOCK_NOW],
  ['cook-1000x700-light.png', 1000, 700, 'light', 'cook', cooked, true, false, STOCK_NOW],
  [
    'cook-use-up-360x720-light.png',
    360,
    720,
    'light',
    'cook/use-up',
    cooked,
    true,
    false,
    STOCK_NOW,
  ],
  [
    'cook-use-up-1000x700-light.png',
    1000,
    700,
    'light',
    'cook/use-up',
    cooked,
    true,
    false,
    STOCK_NOW,
  ],
  // Cook with "Only with what I have" on (docs/decisions/cook-screen.md).
  ['cook-have-360x720-light.png', 360, 720, 'light', 'cook', haveOn, true, false, STOCK_NOW],
  [
    'cook-ingredient-360x720-light.png',
    360,
    720,
    'light',
    'cook/cook-leek/with',
    cooked,
    true,
    false,
    STOCK_NOW,
  ],
];
// The classics: the fictional example dishes of e2e/classics-fixture.mjs, handed to the page.
const CLASSICS_QUERY = '&e2e-store&e2e-content';
const noteOpen = (page) => page.locator('.technique-more summary').click();
const insteadOpen = (page) =>
  page.getByRole('button', { name: 'Instead of Butter, salted' }).click();
const secondStep = async (page) => {
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('.handling-note summary').click();
};
const cooking = `classic/${PAN.id}/cook`;
const classicShots = [
  // Cook, the one list of every dish, on the fictional dishes (#/start went: cook-screen.md).
  ['classics-cook-360x720-light.png', 360, 720, 'light', 'cook', undefined, true],
  ['classics-cook-360x720-dark.png', 360, 720, 'dark', 'cook', undefined, true],
  ['classics-cook-1000x700-light.png', 1000, 700, 'light', 'cook', undefined, true],
  ['classics-country-360x720-light.png', 360, 720, 'light', 'classics/de', undefined, true],
  ['classics-dish-360x720-light.png', 360, 720, 'light', `classic/${PAN.id}`, undefined, true],
  ['classics-dish-1000x700-light.png', 1000, 700, 'light', `classic/${PAN.id}`, undefined, true],
  ['classics-step-360x720-light.png', 360, 720, 'light', cooking, undefined, true],
  ['classics-step-360x720-dark.png', 360, 720, 'dark', cooking, noteOpen, true],
  ['classics-step-1000x700-light.png', 1000, 700, 'light', cooking, undefined, true],
  ['classics-handling-360x720-light.png', 360, 720, 'light', cooking, secondStep, true],
  ['classics-instead-360x720-light.png', 360, 720, 'light', `classic/${PAN.id}`, insteadOpen, true],
  ['classics-instead-1000x700-dark.png', 1000, 700, 'dark', `classic/${PAN.id}`, insteadOpen, true],
].map((shot) => [...shot.slice(0, 5), shot[5], shot[6], false, CLASSICS_QUERY]);

shots.push(...classicShots);

buildApp();
mkdirSync(out, { recursive: true });
const server = await serve(distDir);
const browser = await launch();
for (const [
  file,
  width,
  height,
  colorScheme,
  route,
  steps,
  fullPage,
  withExamples,
  query,
] of shots.filter(([file]) => file.includes(process.argv[2] ?? ''))) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme,
  });
  const page = await context.newPage();
  if (withExamples) await seed(page, server.url);
  if (query?.includes('e2e-content')) {
    await page.addInitScript((data) => {
      globalThis.__culinaContent = data;
    }, classicsContent);
  }
  await page.goto('about:blank');
  await page.goto(`${server.url}?no-sw${query ?? ''}#/${route}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  if (query) await page.waitForTimeout(300);
  if (steps) await steps(page);
  await page.screenshot({ path: out + file, fullPage: Boolean(fullPage) });
  console.log(file);
  await context.close();
}
await browser.close();
await server.close();
