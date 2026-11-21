// The host package's `Files` on a folder, for Node: the recorded data of the checks
// (`scripts/seed-entry.ts` of each app) and the tests are written with it, and the
// native app then reads the same folder through `gioFiles`.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Files } from '@nexumia-de/hospes';

export function nodeFiles(folder: string): Files {
  mkdirSync(folder, { recursive: true });
  return {
    read: (name) => {
      try {
        return readFileSync(join(folder, name), 'utf8');
      } catch {
        return null;
      }
    },
    write: (name, text) => writeFileSync(join(folder, name), text),
    remove: (name) => rmSync(join(folder, name), { force: true }),
    list: () => readdirSync(folder),
  };
}
