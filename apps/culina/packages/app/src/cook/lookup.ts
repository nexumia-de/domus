// Names for the finder's screens: ingredients, the head of a component's family, stock items.
import { familyHeads } from '@culina/engine';
import type { ComponentRef } from '@culina/engine';
import { appLang } from '../shared/locale';
import { displayName } from '../shared/names';
import type { CookSource } from './input';

export interface Lookup {
  /** The name of an ingredient or of the family head of a component; the id when unknown. */
  name(ref: ComponentRef): string;
  /** The reference of a stock item; undefined when the item is not there. */
  itemRef(itemId: string): ComponentRef | undefined;
}

/** An ingredient's name in the app's language (the German name in German, where it has one). */
export const ingredientName = (record: Parameters<typeof displayName>[0]): string =>
  displayName(record, appLang);

export const lookupOf = (source: CookSource): Lookup => {
  const ingredients = new Map(source.ingredients.map((i) => [i.id, displayName(i, appLang)]));
  const byId = new Map(source.components.map((c) => [c.id, c]));
  const heads = new Map(familyHeads(source.components).map((h) => [h.version.family, h]));
  const items = new Map(source.stock.map((s) => [s.id, s.ref]));
  return {
    name(ref) {
      if (ref.kind === 'ingredient') return ingredients.get(ref.id) ?? ref.id;
      const own = byId.get(ref.id);
      return (own === undefined ? undefined : heads.get(own.version.family)?.name) ?? ref.id;
    },
    itemRef: (itemId) => items.get(itemId),
  };
};
