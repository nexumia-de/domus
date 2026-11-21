// The ingredient lookup of the character rules in the running app: the notebook's ingredient,
// else the shipped catalogue's (empty until it is loaded, see `loadNames`).
import { catalogueEntries } from '../classics/names';
import { getIngredient } from '../notebook';
import type { Lookup } from './classes';

export const characterLookup: Lookup = (id) => getIngredient(id) ?? catalogueEntries().get(id);
