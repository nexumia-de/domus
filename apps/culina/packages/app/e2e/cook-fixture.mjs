// The finder's fixture for the browser test: the notebook and stock in test/fixtures/cook-notebook.json,
// and the engine's own answers on the same data (`makeable`, `usesIngredient`), called here with
// the engine bundled as in notebook-fixture.mjs. The screen is compared with these, not with
// typed-in orders.
import { readFileSync } from 'node:fs';
import { engine } from './notebook-fixture.mjs';
import { addStock, sharedIds } from './stock-helpers.mjs';

const raw = JSON.parse(
  readFileSync(new URL('../test/fixtures/cook-notebook.json', import.meta.url), 'utf8'),
);
// Stock is the shared collection of a space: an item's id is the key of the thing it is (here an
// ingredient's id), as the app gives it.
export const data = { ...raw, stock: sharedIds(raw.stock) };
export const TODAY = data.today;
export const NOW = `${TODAY}T08:00:00Z`;

/** The engine's input written out from the stored records, as the finder's adapter is specified. */
export const input = (maxMissing, today = TODAY, stock = data.stock) => ({
  ingredients: data.ingredients.map(({ id, parentId, roles }) => ({
    id,
    ...(parentId ? { parentId } : {}),
    ...(roles ? { roles } : {}),
  })),
  components: data.components,
  dishes: data.dishes,
  templates: engine.SEED_TEMPLATES,
  stock,
  today,
  facts: {},
  options: { maxMissing },
});

export const ranked = (maxMissing, today = TODAY, stock = data.stock) => {
  const r = engine.makeable(input(maxMissing, today, stock));
  if (!r.ok) throw new Error(`makeable: ${r.error.code}`);
  return r;
};

export const keyOf = (c) => `${c.kind}:${c.id}`;
export const keys = (list) => list.map(keyOf);

export const usesKeys = (ingredientId, maxMissing) => {
  const r = engine.usesIngredient(input(maxMissing), ingredientId);
  if (!r.ok) throw new Error(`usesIngredient: ${r.error.code}`);
  return new Set(r.records.map(keyOf));
};

export const ingredientName = (id) => data.ingredients.find((i) => i.id === id).name;
export const itemName = (itemId) => {
  const item = data.stock.find((s) => s.id === itemId);
  return ingredientName(item.ref.id);
};

const withoutId = (item) => {
  const copy = { ...item };
  delete copy.id;
  return copy;
};

/** Writes the fixture (or part of it) through the test hooks: the notebook, then the stock. */
export const store = async (page, only = {}) => {
  const { stock, ...sets } = {
    ingredients: data.ingredients,
    components: data.components,
    dishes: data.dishes,
    stock: data.stock,
    ...only,
  };
  const failed = await page.evaluate(async (records) => {
    const opened = await globalThis.__culinaStore;
    const out = [];
    for (const [kind, list] of Object.entries(records)) {
      for (const record of list) {
        const done = await opened.store.put(kind, record);
        if (!done.ok) out.push(`${kind} ${record.id}: ${JSON.stringify(done.error)}`);
      }
    }
    return out;
  }, sets);
  if (failed.length > 0) throw new Error(`fixture not stored: ${failed.join('; ')}`);
  await addStock(page, stock.map(withoutId));
};
