// Recorded data for checks and screenshots, written with the app's own code into a
// folder the native app reads through MIXTURA_DATA_DIR: a small home bar. Never a
// person's data.
import { createFileStore, ensureSpace } from '@nexumia-de/hospes';
import { nodeFiles } from '@nexumia-de/gjs/node-files';
import { writeStock } from '@mixtura/app/core';

/** The ids of the ingredients the recorded bar has at hand. */
export const BAR = [
  'gin',
  'dry-vermouth',
  'sweet-vermouth',
  'campari',
  'bourbon-whiskey',
  'lemon-juice',
  'lime-juice',
  'simple-syrup',
  'angostura-aromatic-bitters',
  'orange-bitters',
  'club-soda',
  'tonic',
  'vodka',
  'cointreau',
];

/** A home bar; the space is named after `lang` (`de` for German). */
export async function seed(folder: string, lang: 'en' | 'de'): Promise<void> {
  const store = createFileStore(nodeFiles(folder));
  let tick = 0;
  const now = (): string => new Date(Date.UTC(2026, 10, 20, 9, 0, tick++)).toISOString();
  const [space] = await ensureSpace(store, lang === 'de' ? 'Dieses Gerät' : 'This device');
  if (!space) return;
  await writeStock(
    store,
    BAR.map((ingredientId) => ({
      spaceId: space.id,
      ingredientId,
      present: true,
      updatedAt: now(),
    })),
    now,
  );
}

const [folder, lang] = process.argv.slice(2);
if (folder) await seed(folder, lang === 'de' ? 'de' : 'en');
