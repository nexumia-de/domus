// The fixture notebook of the finder tests, as the adapter's source.
import fixture from './fixtures/cook-notebook.json';
import type { CookSource } from '../src/cook/input';

export const TODAY = fixture.today;
export const source: CookSource = {
  ingredients: fixture.ingredients,
  components: fixture.components,
  dishes: fixture.dishes,
  stock: fixture.stock,
} as unknown as CookSource;
