// Builds the pairing data from the raw entity files fetch.mjs saved.
//
//   node tools/flavordb/build.mjs --fetched <YYYY-MM-DD> [--raw <folder>] [--out <file>]
//
// The output is rebuilt, never edited: the same raw files and date give the same bytes. A raw
// file that is no entity is named and left out; the run then ends with exit code 1 and still
// writes the file, so that the problems can be looked at. Needs only Node.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveDataset } from './derive.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const raw = arg('raw', fileURLToPath(new URL('./raw/', import.meta.url)));
const out = arg(
  'out',
  fileURLToPath(new URL('../../packages/app/data/flavour-pairings.json', import.meta.url)),
);
const fetched = arg('fetched');
if (!/^\d{4}-\d{2}-\d{2}$/.test(fetched ?? '')) {
  console.error('--fetched <YYYY-MM-DD> is needed: the date the raw files were fetched');
  process.exit(2);
}
const files = readdirSync(raw).filter((f) => /^\d+\.json$/.test(f));
const docs = files.map((f) => {
  try {
    return JSON.parse(readFileSync(join(raw, f), 'utf8'));
  } catch {
    return { entity_id: Number(f.slice(0, -5)), broken: true };
  }
});
const { data, problems } = deriveDataset(docs, { fetched });
writeFileSync(out, `${JSON.stringify(data)}\n`);
console.log(
  `${data.entities.length} entities, ${Object.keys(data.molecules).length} molecules from ${files.length} files; ${out}`,
);
for (const p of problems) console.log(`  problem: ${p}`);
if (problems.length > 0) process.exitCode = 1;
