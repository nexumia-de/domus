// The real shipped catalogue as the app reads it, and the everyday stock a tester ticked in German
// on 2026-11-21: twelve foods, each the entry the stock picker offers first for its German name.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readCatalogue } from '../src/catalogue/load';
import { chainOf } from '../src/catalogue/tree';
import type { CookSource } from '../src/cook/input';
import type { IngredientRecord, StockRecord } from '../src/records';
import { must } from './must';

const file = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
    'utf8',
  ),
) as { ingredients: IngredientRecord[] };

export const entries = must(
  readCatalogue({
    format: 'culina-ingredient-catalogue',
    formatVersion: 1,
    ingredients: file.ingredients,
  }),
);
export const byId = new Map(entries.map((e) => [e.id, e]));

/** The German search words and the entry the picker offers first for each (after the fix). */
export const TICKED: readonly (readonly [string, string])[] = [
  ['Hühnerei', 'fdc-group-egg'],
  ['Butter', 'fdc-group-butter'],
  ['Weizenmehl', 'fdc-group-wheat-flour'],
  ['Milch', 'fdc-group-milk'],
  ['Zwiebel', 'fdc-170000'],
  ['Kartoffel', 'fdc-170028'],
  ['Tomaten', 'fdc-group-tomatoes'],
  ['Sahne', 'fdc-group-cream'],
  ['Käse', 'fdc-group-cheese'],
  ['Reis', 'fdc-group-rice'],
  ['Zitronensaft', 'fdc-167747'],
  ['Knoblauch', 'fdc-169230'],
];
export const TICKED_IDS = TICKED.map(([, id]) => id);
/** Table salt and black pepper (src/stock/staples.ts names the same two). */
export const SALT_AND_PEPPER = ['fdc-173468', 'fdc-170931'];

/** The notebook after the ticks: each entry with its parent chain, as adoptEntry copies it. */
export const sourceOf = (ids: readonly string[], always: readonly string[]): CookSource => {
  const records = new Map<string, IngredientRecord>();
  for (const id of [...ids, ...always]) {
    const entry = must(byId.get(id));
    for (const e of [...chainOf(entry, byId), entry]) records.set(e.id, e);
  }
  const stock: StockRecord[] = [...ids, ...always].map((id) => ({
    id,
    ref: { kind: 'ingredient', id },
    ...(always.includes(id) ? { always: true } : {}),
  }));
  return { ingredients: [...records.values()], components: [], dishes: [], stock };
};
