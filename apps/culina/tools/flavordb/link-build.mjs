// Writes the links from the catalogue's ingredients to the entities of the pairing data.
//
//   node tools/flavordb/link-build.mjs [--out <file>]
//
// Reads packages/app/data/ingredient-catalogue.json, packages/app/data/flavour-pairings.json and
// links-own.json. The output is rebuilt, never edited; a problem (a correction that names no
// entity or reaches no ingredient) ends the run with exit code 1. Needs only Node.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { linkCatalogue } from './link.mjs';

export const FORMAT = 'culina-flavour-links';
const file = (path) => fileURLToPath(new URL(path, import.meta.url));
const read = (path) => JSON.parse(readFileSync(file(path), 'utf8'));

/** The links file for the three inputs. */
export function buildLinks(catalogue, pairings, own) {
  const { links, problems } = linkCatalogue(catalogue.ingredients, pairings.entities, own);
  return {
    data: {
      format: FORMAT,
      formatVersion: 1,
      about:
        'Which entity of the pairing data stands for an ingredient of the catalogue. A judgement of this project: the rule of tools/flavordb/link.mjs and the corrections of links-own.json.',
      links,
    },
    problems,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out');
  const out = i === -1 ? file('../../packages/app/data/flavour-links.json') : process.argv[i + 1];
  const { data, problems } = buildLinks(
    read('../../packages/app/data/ingredient-catalogue.json'),
    read('../../packages/app/data/flavour-pairings.json'),
    read('./links-own.json'),
  );
  writeFileSync(out, `${JSON.stringify(data)}\n`);
  console.log(`${Object.keys(data.links).length} links; ${out}`);
  for (const p of problems) console.log(`  problem: ${p}`);
  if (problems.length > 0) process.exitCode = 1;
}
