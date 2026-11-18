import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { contrast, PAIRS } from './contrast-math';
import { readThemes } from './css';
import { must } from './must';

const themes = readThemes();
const design = readFileSync(new URL('../../../docs/design.md', import.meta.url), 'utf8');

test('both dark blocks of tokens.css are the same', () => {
  expect(themes.darkSystem).toEqual(themes.darkChosen);
});

test('light and dark define the same colour tokens', () => {
  expect(Object.keys(themes.darkChosen).sort()).toEqual(Object.keys(themes.light).sort());
});

for (const [name, palette] of [
  ['light', themes.light],
  ['dark', themes.darkChosen],
] as const) {
  test(`every text and UI pair meets WCAG AA in ${name}`, () => {
    for (const { fg, bg, min } of PAIRS) {
      expect(
        contrast(must(palette[fg], fg), must(palette[bg], bg)),
        `${fg} on ${bg}`,
      ).toBeGreaterThanOrEqual(min);
    }
  });
}

test('the ratios recorded in docs/design.md are the computed ones', () => {
  for (const { fg, bg, min } of PAIRS) {
    const row = design.split('\n').find((line) => line.startsWith(`| \`${fg}\` on \`${bg}\``));
    expect(row, `${fg} on ${bg} is missing from design.md`).toBeDefined();
    const light = contrast(must(themes.light[fg]), must(themes.light[bg])).toFixed(2);
    const dark = contrast(must(themes.darkChosen[fg]), must(themes.darkChosen[bg])).toFixed(2);
    const cells = must(row)
      .split('|')
      .map((cell) => cell.trim());
    expect(cells.slice(2, 5), `${fg} on ${bg}`).toEqual([light, dark, String(min)]);
  }
});
