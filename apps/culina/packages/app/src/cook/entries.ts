// The finder's view of the app's dishes: the entry of every own dish (the head of each family, as
// the engine lists them) and of every shipped classic, by key, and the shipped side of the
// question. Reads the notebook cache, the shipped content and the catalogue as they are now.
import type { Classic } from '@culina/engine';
import { allEntries } from '../browse/entry';
import type { DishEntry } from '../browse/entry';
import { characterLookup } from '../characters/lookup';
import { classics } from '../classics/content';
import { currentLang } from '../classics/lang';
import { catalogueEntries } from '../classics/names';
import { listDishes, notebook } from '../notebook';
import type { Shipped } from './finder';

/** Every dish entry by key (`own:<id>`, `shipped:<id>`). */
export const dishEntries = (shipped: readonly Classic[] = classics()): Map<string, DishEntry> =>
  new Map(
    allEntries(notebook(), listDishes(), shipped, characterLookup, currentLang()).map((e) => [
      e.key,
      e,
    ]),
  );

/** The shipped classics, the catalogue and the content language, as loaded so far. */
export const shippedNow = (): Shipped => ({
  classics: classics(),
  catalogue: catalogueEntries(),
  lang: currentLang(),
});
