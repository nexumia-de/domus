import { must } from './must';

/** WCAG 2.x relative luminance and contrast ratio for #rrggbb colours (sRGB, no alpha). */
const channel = (v: number): number => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export const luminance = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};

export const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (must(hi) + 0.05) / (must(lo) + 0.05);
};

export interface Pair {
  fg: string;
  bg: string;
  /** Minimum ratio: 4.5 for text, 3 for UI parts and the focus ring. */
  min: 4.5 | 3;
  use: string;
}

export const PAIRS: readonly Pair[] = [
  { fg: '--text', bg: '--bg', min: 4.5, use: 'Body text' },
  { fg: '--text', bg: '--surface', min: 4.5, use: 'Text on bars' },
  { fg: '--text', bg: '--surface-2', min: 4.5, use: 'Text on groups' },
  { fg: '--text', bg: '--accent-soft', min: 4.5, use: 'Text on selected' },
  { fg: '--text-muted', bg: '--bg', min: 4.5, use: 'Secondary text' },
  { fg: '--text-muted', bg: '--surface', min: 4.5, use: 'Navigation labels' },
  { fg: '--text-muted', bg: '--surface-2', min: 4.5, use: 'Hints in groups' },
  { fg: '--text-muted', bg: '--accent-soft', min: 4.5, use: 'Hints on selected' },
  { fg: '--accent', bg: '--bg', min: 4.5, use: 'Accent text' },
  { fg: '--accent', bg: '--surface', min: 4.5, use: 'Accent text on bars' },
  { fg: '--accent', bg: '--accent-soft', min: 4.5, use: 'Selected navigation' },
  { fg: '--on-accent', bg: '--accent', min: 4.5, use: 'Text on accent' },
  { fg: '--border', bg: '--bg', min: 3, use: 'Control outline' },
  { fg: '--border', bg: '--surface', min: 3, use: 'Control outline on bars' },
  { fg: '--focus', bg: '--bg', min: 3, use: 'Focus ring' },
  { fg: '--focus', bg: '--surface', min: 3, use: 'Focus ring on bars' },
  { fg: '--focus', bg: '--accent-soft', min: 3, use: 'Focus ring on selected' },
];
