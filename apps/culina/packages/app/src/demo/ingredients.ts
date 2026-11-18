// Example ingredients. Generic names; every number is made up for the demonstration.
import type { IngredientRecord } from '../records';

const EXAMPLE = 'Example data, not a measured figure';

const plain = (id: string, name: string, roles?: string[]): IngredientRecord => ({
  id,
  name,
  ...(roles === undefined ? {} : { roles }),
  note: 'Example ingredient',
});

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
