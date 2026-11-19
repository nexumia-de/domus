// Merges the hand-kept German names (tools/catalogue/names-de-own.json) into an existing catalogue
// file, offline: no dataset, no network. Idempotent. build.mjs does the same step when it
// regenerates the file, so this script is only needed when the overlay changes and the USDA
// dataset is not at hand.
//
//   node tools/catalogue/merge-own-names.mjs [catalogue file] [overlay file]
//
// Defaults: packages/app/data/ingredient-catalogue.json and tools/catalogue/names-de-own.json.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serialise } from './build.mjs';
import { mergeOwnNames, ownNamesDataset } from './own-names.mjs';

const catalogueFile = fileURLToPath(
  new URL('../../packages/app/data/ingredient-catalogue.json', import.meta.url),
);
const overlayFile = fileURLToPath(new URL('./names-de-own.json', import.meta.url));

const main = () => {
  const [catalogueArg, overlayArg] = process.argv.slice(2);
  const out = catalogueArg ?? catalogueFile;
  const overlayText = readFileSync(overlayArg ?? overlayFile);
  const overlay = JSON.parse(overlayText.toString('utf8'));
  const envelope = JSON.parse(readFileSync(out, 'utf8'));
  const result = mergeOwnNames(envelope.ingredients, overlay);
  if (result.unknown.length > 0) {
    console.error(`overlay ids not in the catalogue: ${result.unknown.join(', ')}`);
    process.exit(1);
  }
  const head = {};
  for (const [key, value] of Object.entries(envelope)) {
    if (key === 'ownNamesDataset') continue;
    if (key === 'generatedBy')
      head.ownNamesDataset = ownNamesDataset(
        overlay,
        createHash('sha256').update(overlayText).digest('hex'),
      );
    head[key] = value;
  }
  head.ingredients = result.ingredients;
  writeFileSync(out, serialise(head));
  console.log(
    `${result.merged} own German names merged, ${result.keptOther} entries keep their Wikidata name -> ${out}`,
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
