// Example ingredients. Generic names; every number is made up for the demonstration.
import type { IngredientRecord } from '../records';

const EXAMPLE = 'Example data, not a measured figure';

/** German names of the example ingredients: example data, not the catalogue. */
const DE: Record<string, string> = {
  flour: 'Mehl',
  water: 'Wasser',
  salt: 'Salz',
  yeast: 'Trockenhefe',
  butter: 'Butter',
  oil: 'Öl',
  onion: 'Zwiebel',
  carrot: 'Möhre',
  celery: 'Staudensellerie',
  parsley: 'Petersilie',
  'lemon-juice': 'Zitronensaft',
  'tomato-pepper-puree':
    'Langsam gekochtes Tomaten-Paprika-Püree, zweimal passiert und mit einer Prise Zucker gewürzt',
};

const plain = (id: string, name: string, roles?: string[]): IngredientRecord => {
  const german = DE[id];
  return {
    id,
    name,
    ...(german === undefined
      ? {}
      : { names: { de: { name: german, source: 'Example data, not a source' } } }),
    ...(roles === undefined ? {} : { roles }),
    note: 'Example ingredient',
  };
};

export const INGREDIENTS: IngredientRecord[] = [
  plain('flour', 'Flour', ['flour']),
  plain('water', 'Water', ['water']),
  plain('salt', 'Salt'),
  plain('yeast', 'Dry yeast'),
  plain('butter', 'Butter', ['fat']),
  plain('oil', 'Oil', ['fat']),
  {
    ...plain('onion', 'Onion', ['aromatic']),
    yields: [{ state: 'raw', percent: 80, source: EXAMPLE }],
  },
  {
    ...plain('carrot', 'Carrot', ['aromatic']),
    yields: [{ state: 'raw', percent: 90, source: EXAMPLE }],
  },
  plain('celery', 'Celery', ['aromatic']),
  plain('parsley', 'Parsley', ['garnish']),
  plain('lemon-juice', 'Lemon juice', ['acid']),
  plain(
    'tomato-pepper-puree',
    'Slow-cooked tomato and sweet pepper puree, strained twice and seasoned with a pinch of sugar',
  ),
];
