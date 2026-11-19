// The classics fixture of the browser test: two FICTIONAL example dishes and one example technique
// (test/fixtures/classics-example.json: not recipes, no real source), handed to the page on
// `globalThis.__culinaContent` before the app loads (the page URL has `?e2e-content`). The
// expected amounts come from the engine, as in notebook-fixture.mjs.
import { readFileSync } from 'node:fs';
import { engine } from './notebook-fixture.mjs';

export const content = JSON.parse(
  readFileSync(new URL('../test/fixtures/classics-example.json', import.meta.url), 'utf8'),
);
export const [PAN, SECOND] = content.classics;
export const [TECHNIQUE] = content.techniques;
export const [RULE_BUTTER, RULE_OIL] = content.handling;
export const [SUB_BUTTER] = content.substitutes;

/** The engine's amount of the line `key` of the first component, for some portions, in grams. */
export const engineGrams = (classic, key, portions) => {
  const derived = engine.deriveClassic(classic, { portions, lang: 'en' });
  if (!derived.ok) throw new Error(`derive: ${derived.error.code}`);
  const index = classic.components[0].lines.findIndex((l) => l.key === key);
  return derived.components[0].lines[index].amount.value;
};

/** Opens a hash with the fixture injected. */
export const openWith = async (page, origin, hash, query = '?no-sw&e2e-store&e2e-content') => {
  await page.goto('about:blank');
  await page.addInitScript((data) => {
    globalThis.__culinaContent = data;
  }, content);
  await page.goto(`${origin}/${query}#/${hash}`);
  await page.getByRole('heading', { level: 1 }).first().waitFor();
};
