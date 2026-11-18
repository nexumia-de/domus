// Generates the ingredient catalogue from USDA FoodData Central, SR Legacy (JSON).
//
//   node tools/catalogue/build.mjs <unzipped dataset folder or .json file> --refuse <FOOD_DES.txt>
//     [--out <file>]
//
// The output is rebuilt, never edited: the same dataset gives the same bytes (no clock, rows
// sorted by id). The rules are in derive.mjs and stated in docs/ingredient-catalogue.md. Not
// part of the app bundle; it needs only Node.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveDensity, deriveUnitWeight, isBasic, nameOf } from './derive.mjs';
import { groupRows } from './group.mjs';
import { germanNames } from './wikidata.mjs';
import { deriveYields, readRefuse, REFUSE_SOURCE } from './yields.mjs';

const snapshotFile = fileURLToPath(new URL('./wikidata-de.json', import.meta.url));
const unitsFile = fileURLToPath(new URL('../../packages/engine/data/units.json', import.meta.url));
const defaultOut = fileURLToPath(
  new URL('../../packages/app/data/ingredient-catalogue.json', import.meta.url),
);

const DATASET = 'USDA FoodData Central, SR Legacy';
const LICENCE =
  'CC0 1.0 Universal (public domain), as stated on https://fdc.nal.usda.gov/ (section Licensing)';

const jsonFileOf = (path) => {
  if (!statSync(path).isDirectory()) return path;
  const found = readdirSync(path).filter((f) => f.endsWith('.json'));
  if (found.length !== 1) throw new Error(`expected exactly one .json file in ${path}`);
  return join(path, found[0]);
};

/** The release in the file name, FoodData_Central_sr_legacy_food_json_2018-04.json. */
const releaseOf = (file) => {
  const match = /^FoodData_Central_sr_legacy_food_json_(\d{4}-\d{2}(?:-\d{2})?)\.json$/.exec(
    basename(file),
  );
  if (match === null) throw new Error(`not an SR Legacy JSON file name: ${basename(file)}`);
  return match[1];
};

const units = JSON.parse(readFileSync(unitsFile, 'utf8'));
const mlOf = (unit) => units[unit].toBase;

/**
 * Rows for every selected food that has a density or a unit weight, sorted by id. `refuse` (from
 * readRefuse) adds the yields; without it the rows have none. `wikidata` (the parsed snapshot) adds
 * the German names; without it the rows have none.
 */
export const buildRows = (foods, release, refuse = new Map(), wikidata = undefined) => {
  const german =
    wikidata === undefined ? new Map() : germanNames(foods.filter(isBasic), wikidata).found;
  const where = `${DATASET}, release ${release}`;
  const rows = [];
  for (const food of foods) {
    if (!isBasic(food)) continue;
    const portions = food.foodPortions ?? [];
    const density = deriveDensity(portions, mlOf);
    const piece = deriveUnitWeight(portions);
    if (density === undefined && piece === undefined) continue;
    const row = { id: `fdc-${food.fdcId}`, name: nameOf(food.description) };
    const named = german.get(food.fdcId);
    if (named !== undefined) row.names = named.names;
    if (density !== undefined) {
      row.densityGPerMl = {
        value: density.value,
        source: `${where}, FDC ID ${food.fdcId}, portion: ${density.portion}; 1 ${density.unit} = ${mlOf(density.unit)} ml (US customary, engine units table)`,
      };
    }
    if (piece !== undefined) {
      row.unitWeightG = {
        value: piece.value,
        source: `${where}, FDC ID ${food.fdcId}, portion: ${piece.portion}`,
      };
    }
    const yields = deriveYields(food, refuse);
    if (yields !== undefined) row.yields = yields;
    row['x-fdc'] = {
      id: food.fdcId,
      description: food.description,
      ...(food.foodCategory?.description !== undefined
        ? { category: food.foodCategory.description }
        : {}),
    };
    rows.push(row);
  }
  // A name that two rows share is made unique by its full description, then by its id.
  const byName = new Map();
  for (const row of rows) byName.set(row.name, (byName.get(row.name) ?? 0) + 1);
  for (const row of rows) {
    if (byName.get(row.name) > 1) row.name = row['x-fdc'].description.slice(0, 120);
  }
  const byFull = new Map();
  for (const row of rows) byFull.set(row.name, (byFull.get(row.name) ?? 0) + 1);
  for (const row of rows) {
    if (byFull.get(row.name) > 1) row.name = `${row.name.slice(0, 100)} (FDC ${row['x-fdc'].id})`;
  }
  return rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
};

/** The catalogue entries: the food rows with their parent links, and the parents. */
export const buildCatalogue = (foods, release, refuse = new Map(), wikidata = undefined) =>
  groupRows(buildRows(foods, release, refuse, wikidata));

/** The file's text: the envelope with one ingredient per line, so diffs stay readable. */
export const serialise = (envelope) => {
  const { ingredients, ...head } = envelope;
  const lines = ingredients.map((row) => `    ${JSON.stringify(row)}`);
  const top = JSON.stringify(head, null, 2).slice(0, -2);
  return `${top},\n  "ingredients": [\n${lines.join(',\n')}\n  ]\n}\n`;
};

const main = () => {
  const args = process.argv.slice(2);
  const outAt = args.indexOf('--out');
  const out = outAt === -1 ? defaultOut : args[outAt + 1];
  const refuseAt = args.indexOf('--refuse');
  const refuseFile = refuseAt === -1 ? undefined : args[refuseAt + 1];
  const input = args.find(
    (a, i) => !a.startsWith('--') && args[i - 1] !== '--out' && args[i - 1] !== '--refuse',
  );
  if (input === undefined || out === undefined || refuseFile === undefined) {
    console.error(
      'usage: node tools/catalogue/build.mjs <dataset folder or .json> --refuse <FOOD_DES.txt> [--out <file>]',
    );
    process.exit(2);
  }
  const refuseText = readFileSync(refuseFile);
  const file = jsonFileOf(input);
  const text = readFileSync(file);
  const release = releaseOf(file);
  const foods = JSON.parse(text.toString('utf8')).SRLegacyFoods;
  if (!Array.isArray(foods)) throw new Error('no SRLegacyFoods list in the file');
  const snapshotText = readFileSync(snapshotFile);
  const wikidata = JSON.parse(snapshotText.toString('utf8'));
  const ingredients = buildCatalogue(
    foods,
    release,
    readRefuse(refuseText.toString('latin1')),
    wikidata,
  );
  const envelope = {
    format: 'culina-ingredient-catalogue',
    formatVersion: 1,
    dataset: {
      name: DATASET,
      release,
      file: basename(file),
      sha256: createHash('sha256').update(text).digest('hex'),
      licence: LICENCE,
    },
    refuseDataset: {
      name: REFUSE_SOURCE,
      file: basename(refuseFile),
      sha256: createHash('sha256').update(refuseText).digest('hex'),
      licence: LICENCE,
    },
    namesDataset: {
      name: 'Wikidata, German labels and aliases by USDA NDB number (P1978)',
      file: 'tools/catalogue/wikidata-de.json',
      sha256: createHash('sha256').update(snapshotText).digest('hex'),
      retrieved: wikidata.retrieved,
      licence:
        'CC0 1.0 Universal (public domain), as stated on https://www.wikidata.org/wiki/Wikidata:Licensing',
    },
    generatedBy: 'tools/catalogue/build.mjs',
    ingredients,
  };
  writeFileSync(out, serialise(envelope));
  const foodRows = ingredients.filter((r) => r['x-fdc'] !== undefined);
  const groups = ingredients.filter((r) => r['x-group'] !== undefined);
  const count = (list, field) => list.filter((r) => r[field]).length;
  console.log(
    `${ingredients.length} entries: ${foodRows.length} foods (${count(foodRows, 'densityGPerMl')} density, ${count(foodRows, 'unitWeightG')} unit weight, ${count(foodRows, 'yields')} yields), ${groups.length} parents (${count(groups, 'densityGPerMl')} density, ${count(groups, 'unitWeightG')} unit weight); German names: ${count(foodRows, 'names')} foods, ${count(groups, 'names')} parents -> ${out}`,
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
