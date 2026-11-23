// The unit words of written amounts that Culina knows, and nothing else: `{500%g}` is grams,
// `{2%cups}` is cups, `{2}` is a count; `{2%cloves}` is not known and stays open. A word that is
// no unit of the table gets a size only from a named source in data/unit-words.json (`sized`,
// none so far); EL, TL, a pinch, a knife tip, a cup of cream or a packet stay open, as written.
import words from '../../data/unit-words.json';
import type { UnitId } from '../amounts/types';

const WORDS: Record<string, UnitId> = {
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  tsp: 'tsp',
  tsps: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'tbsp',
  tbsps: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  cup: 'cup',
  cups: 'cup',
};

/** The unit a unit word means, `count` for no unit, or undefined when it is not known. */
export function unitFromWord(word: string | undefined): UnitId | undefined {
  if (word === undefined || word.trim() === '') return 'count';
  return WORDS[word.trim().toLowerCase()];
}

/** A word that is not a unit of the table but has a size by a named source: `EL` is 15 ml. */
export interface SizedWord {
  /** The short form the word is listed under (`EL`). */
  key: string;
  unit: UnitId;
  /** Units of `unit` in one of the word. */
  factor: number;
  source: string;
}

export interface SizedEntry {
  words: string[];
  unit: string;
  factor: number;
  source: string;
}

interface VagueEntry {
  words: string[];
  reason: string;
}

const sized = words.sized as unknown as Record<string, SizedEntry>;
const vague = words.noFixedSize as Record<string, VagueEntry>;

const lookup = <T extends { words: string[] }>(
  table: Record<string, T>,
  word: string | undefined,
): [string, T] | undefined => {
  const w = word?.trim().toLowerCase();
  if (w === undefined || w === '') return undefined;
  return Object.entries(table).find(([, e]) => e.words.some((x) => x.toLowerCase() === w));
};

/** The size of a word in a table of sized words, or undefined; the table is data/unit-words.json. */
export function sizedIn(
  table: Record<string, SizedEntry>,
  word: string | undefined,
): SizedWord | undefined {
  const found = lookup(table, word);
  if (found === undefined) return undefined;
  const [key, entry] = found;
  return { key, unit: entry.unit as UnitId, factor: entry.factor, source: entry.source };
}

/** The size of a word by data/unit-words.json (none has one yet), or undefined. */
export const sizedWord = (word: string | undefined): SizedWord | undefined => sizedIn(sized, word);

/** True for a word that has no fixed size by any source read (`Prise`, `Msp.`, `Becher`). */
export const noFixedSizeWord = (word: string | undefined): boolean =>
  lookup(vague, word) !== undefined;

/** The unit words a written amount may use, as a prompt lists them: table words, then sized ones. */
export const UNIT_WORDS: readonly string[] = [
  'g',
  'kg',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'oz',
  'lb',
  ...Object.keys(sized),
];

/** The words without a fixed size, as a prompt lists them. */
export const NO_FIXED_SIZE_WORDS: readonly string[] = Object.keys(vague);
