import { readdirSync } from 'node:fs';
import { expect, test } from 'vitest';
import { readSrc, srcUrl } from './css';
import { must } from './must';

const sheets = readdirSync(srcUrl('styles/')).filter((name) => name.endsWith('.css'));
const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

test('there are stylesheets besides tokens.css', () => {
  expect(sheets).toContain('tokens.css');
  expect(sheets.length).toBeGreaterThan(2);
});

test('no stylesheet except tokens.css has a colour value or a font size that is not a token', () => {
  for (const name of sheets.filter((sheet) => sheet !== 'tokens.css')) {
    const css = stripComments(readSrc(`styles/${name}`));
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g), `${name}: hex colour`).toBeNull();
    expect(
      css.match(/\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g),
      `${name}: colour function`,
    ).toBeNull();
    const sizes = [...css.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => must(m[1]).trim());
    for (const size of sizes)
      expect(size, `${name}: font-size`).toMatch(/^(var\(--fs-[a-z]+\)|inherit|100%)$/);
    expect(css, `${name}: font shorthand`).not.toMatch(/(^|[\s;{])font:/);
  }
});

test('the rule would catch a violation', () => {
  expect('a { color: #fff; }'.match(/#[0-9a-fA-F]{3,8}\b/g)).not.toBeNull();
  expect(must('a { font-size: 14px; }'.match(/font-size:\s*([^;}]+)/))[1]).not.toMatch(/^var\(/);
});

test('tokens.css defines the colour, type, spacing and radius tokens', () => {
  const css = readSrc('styles/tokens.css');
  for (const token of [
    '--bg',
    '--text',
    '--accent',
    '--focus',
    '--fs-md',
    '--sp-4',
    '--radius',
    '--target',
  ]) {
    expect(css, token).toContain(`${token}:`);
  }
  expect(css).toMatch(/--target:\s*44px/);
});

test('the system fonts only: no web font, no import of another origin', () => {
  for (const name of sheets) {
    const css = readSrc(`styles/${name}`);
    expect(css).not.toMatch(/@font-face|url\(|https?:/);
  }
});

test('no hover-only affordance: no stylesheet styles :hover', () => {
  for (const name of sheets) expect(readSrc(`styles/${name}`), name).not.toMatch(/:hover/);
});
