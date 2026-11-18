// Writes the documentation screenshots to docs/screenshots/ (scale 2): `npm run screenshots -w @culina/app`.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp, distDir, launch } from './harness.mjs';
import { serve } from './serve.mjs';

const out = fileURLToPath(new URL('../../../docs/screenshots/', import.meta.url));
const shots = [
  ['ratios-360x720-light.png', 360, 720, 'light', 'ratios'],
  ['ratios-360x720-dark.png', 360, 720, 'dark', 'ratios'],
  ['settings-360x720-light.png', 360, 720, 'light', 'settings'],
  ['ratios-1000x700-light.png', 1000, 700, 'light', 'ratios'],
];

buildApp();
mkdirSync(out, { recursive: true });
const server = await serve(distDir);
const browser = await launch();
for (const [file, width, height, colorScheme, route] of shots) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme,
  });
  const page = await context.newPage();
  await page.goto(`${server.url}?no-sw#/${route}`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.screenshot({ path: out + file });
  console.log(file);
  await context.close();
}
await browser.close();
await server.close();
