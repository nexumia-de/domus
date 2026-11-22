// The shipped side of the finder's question: the classics, the catalogue and the content language,
// as loaded so far. The entries of the dishes come from the one cached accessor (browse/entries.ts).
import { classics } from '../classics/content';
import { currentLang } from '../classics/lang';
import { catalogueEntries } from '../classics/names';
import type { Shipped } from './finder';

export const shippedNow = (): Shipped => ({
  classics: classics(),
  catalogue: catalogueEntries(),
  lang: currentLang(),
});
