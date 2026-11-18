// The notebook cache as the finder's source, and the clock: today comes from the shell's injected
// clock in this one place.
import { allVersions, listIngredients, listStock, today } from '../notebook';
import type { CookSource } from './input';

export const notebookSource = (): CookSource => ({
  ingredients: listIngredients(),
  components: allVersions('components'),
  dishes: allVersions('dishes'),
  stock: listStock(),
});

/** The day the ranking is made for, `YYYY-MM-DD`. */
export const cookToday = (): string => today();
