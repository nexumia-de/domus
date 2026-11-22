// Recorded data for checks and screenshots, written with the app's own code
// into a folder the native app reads through EMPTIO_DATA_DIR. Never a
// person's data.
import { createFileStore, ensureSpace } from '@nexumia-de/hospes';
import { nodeFiles } from '@nexumia-de/gjs/node-files';
import { addCategory, addToList, setBought, type ListDeps } from '@emptio/app/core';

/** A household's list on an ordinary day; German when `lang` is `de`. */
export async function seed(folder: string, lang: 'en' | 'de'): Promise<void> {
  const store = createFileStore(nodeFiles(folder));
  let tick = 0;
  let id = 0;
  const deps: ListDeps = {
    store,
    now: () => new Date(Date.UTC(2026, 10, 20, 9, 0, tick++)).toISOString(),
    newId: () => `e-${++id}`,
  };
  const [space] = await ensureSpace(store, lang === 'de' ? 'Zuhause' : 'Home');
  if (!space) return;
  const de = lang === 'de';
  const add = (name: string, more: Partial<Parameters<typeof addToList>[2]> = {}) =>
    addToList(deps, space.id, { name, ...more });
  await add(de ? 'Brot' : 'Bread', { priority: 'now', categoryId: 'bakery' });
  await add(de ? 'Toilettenpapier' : 'Toilet paper', { priority: 'now', categoryId: 'household' });
  await add(de ? 'Äpfel' : 'Apples', { amount: '1 kg', categoryId: 'produce' });
  await add(de ? 'Milch' : 'Milk', { amount: de ? '2 Liter' : '2 litres', categoryId: 'dairy' });
  await add(de ? 'Spülmittel' : 'Washing-up liquid', { categoryId: 'cleaning' });
  await add(de ? 'Vanilleschoten' : 'Vanilla pods', {
    priority: 'sometime',
    note: de ? 'für den Geburtstagskuchen' : 'for the birthday cake',
    categoryId: 'baking',
  });
  const butter = await add('Butter', { categoryId: 'dairy' });
  const rice = await add(de ? 'Reis' : 'Rice', { categoryId: 'pantry' });
  if (butter) await setBought(deps, space.id, butter.id, true);
  if (rice) await setBought(deps, space.id, rice.id, true);
  await addCategory(deps, space.id, de ? 'Garten' : 'Garden');
}

const [folder, lang] = process.argv.slice(2);
if (folder) await seed(folder, lang === 'de' ? 'de' : 'en');
