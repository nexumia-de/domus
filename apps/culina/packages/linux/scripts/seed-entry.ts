// Recorded data for checks and screenshots, written with the app's own code into a folder the
// native app reads through CULINA_DATA_DIR: a small kitchen (catalogue ingredients as the web
// app writes them). Never a person's data.
import { createFileStore, ensureSpace, localChange } from '@nexumia-de/hospes';
import { nodeFiles } from '@nexumia-de/gjs/node-files';
import { STOCK, tickEdit } from '@culina/app/core';

/** The catalogue ids of what the recorded kitchen has: enough for a few classics. */
export const KITCHEN = [
  'fdc-173468',
  'fdc-170931',
  'fdc-group-butter',
  'fdc-group-egg-whole',
  'fdc-group-milk',
  'fdc-group-wheat-flour',
  'fdc-group-sugars',
  'fdc-170000',
  'fdc-170028',
];

/** A kitchen; the space is named after `lang` (`de` for German). */
export async function seed(folder: string, lang: 'en' | 'de'): Promise<void> {
  const store = createFileStore(nodeFiles(folder));
  let tick = 0;
  const now = (): string => new Date(Date.UTC(2026, 10, 20, 9, 0, tick++)).toISOString();
  const [space] = await ensureSpace(store, lang === 'de' ? 'Dieses Gerät' : 'This device');
  if (!space) return;
  for (const id of KITCHEN) {
    await localChange(store, space.id, STOCK, now, (records) => tickEdit(records, id, false).edit);
  }
}

const [folder, lang] = process.argv.slice(2);
if (folder) await seed(folder, lang === 'de' ? 'de' : 'en');
