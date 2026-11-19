import { readFileSync } from 'node:fs';
import { must } from './must';

export const srcUrl = (path: string): URL => new URL(`../src/${path}`, import.meta.url);

export const readSrc = (path: string): string => readFileSync(srcUrl(path), 'utf8');

export type Palette = Record<string, string>;

/** The body of the first `{ ... }` block that follows `header` in `css`. */
const block = (css: string, header: string): string => {
  const start = css.indexOf(header);
  if (start < 0) throw new Error(`block not found: ${header}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`unclosed block: ${header}`);
};

const colours = (body: string): Palette => {
  const out: Palette = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g))
    out[must(m[1])] = must(m[2]).toLowerCase();
  return out;
};

export interface Themes {
  light: Palette;
  /** Dark under the system preference (unless the user chose Light). */
  darkSystem: Palette;
  /** Dark chosen explicitly. */
  darkChosen: Palette;
}

/** The colour tokens of tokens.css per theme block. */
export const readThemes = (): Themes => {
  const css = readSrc('styles/tokens.css');
  const media = block(css, '@media (prefers-color-scheme: dark)');
  return {
    light: colours(block(css, '\n:root {')),
    darkSystem: colours(block(media, ":root:not([data-theme='light'])")),
    darkChosen: colours(block(css, ":root[data-theme='dark']")),
  };
};
