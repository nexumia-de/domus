// The unit words of Cooklang quantities that Culina knows, and nothing else: `{500%g}` is grams,
// `{2%cups}` is cups, `{2}` is a count; `{2%cloves}` is not known and stays open.
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

/** The unit a Cooklang unit word means, `count` for no unit, or undefined when it is not known. */
export function unitFromWord(word: string | undefined): UnitId | undefined {
  if (word === undefined || word.trim() === '') return 'count';
  return WORDS[word.trim().toLowerCase()];
}
