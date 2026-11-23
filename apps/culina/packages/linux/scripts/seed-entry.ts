// Recorded data for checks and screenshots, written with the app's own code into a folder the
// native app reads through CULINA_DATA_DIR: a small kitchen (catalogue ingredients as the web
// app writes them), the milk with a use-by date tomorrow, written with the web app's own edit
// (`saveEdit`, stored as `bestBefore`; the native app writes no dates), so that Cook's order
// "Use up first" has something to place. Never a person's data.
import { createFileStore, ensureSpace, localChange } from '@nexumia-de/hospes';
import { nodeFiles } from '@nexumia-de/gjs/node-files';
import { STOCK, saveEdit, tickEdit } from '@culina/app/core';

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

/** The item with a use-by date, one day after the day the seed is written. */
export const DATED = 'fdc-group-milk';

/** Tomorrow on this machine's clock, `YYYY-MM-DD`. */
const tomorrow = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
};

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
  await localChange(
    store,
    space.id,
    STOCK,
    now,
    (records) => saveEdit(records, DATED, { useBy: tomorrow() }).edit,
  );
}

const [folder, lang] = process.argv.slice(2);
if (folder) await seed(folder, lang === 'de' ? 'de' : 'en');
