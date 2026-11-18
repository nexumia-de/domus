// Trims two saved Wikidata SPARQL responses to the snapshot the generator reads (wikidata-de.json).
// No network: the responses are fetched by hand, see docs/development.md (German names).
//
//   node tools/catalogue/snapshot.mjs classes-query <items response .json>
//       prints the second query (English labels of the classes the items are instances of)
//   node tools/catalogue/snapshot.mjs build <items response> <classes response> <dataset .json> <date>
//       [--out <file>]
//
// Only rows whose NDB number belongs to a food row of the catalogue are kept (the rows buildRows
// makes from the dataset). Each kept row
// records how many NDB numbers its item carries in the whole response (`ndbCount`), which the tie
// rule needs and the trimmed rows could not tell otherwise.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildRows } from './build.mjs';
import { normaliseNdb } from './wikidata.mjs';

export const SEPARATOR = '¦';
const defaultOut = fileURLToPath(new URL('./wikidata-de.json', import.meta.url));
const itemsQueryFile = fileURLToPath(new URL('./wikidata-items.rq', import.meta.url));

const value = (cell) => cell?.value;
const list = (cell) => (value(cell) ?? '').split(SEPARATOR).filter((x) => x !== '');
const qid = (uri) => uri.slice(uri.lastIndexOf('/') + 1);

/** The P31 class ids of a response row ("i:Q16521" entries of the `classes` column). */
export const instancesOf = (binding) =>
  list(binding.classes)
    .filter((c) => c.startsWith('i:'))
    .map((c) => c.slice(2))
    .sort();

export const classesQuery = (items) => {
  const ids = [...new Set(items.flatMap(instancesOf))].sort();
  return `SELECT ?c ?l WHERE { VALUES ?c { ${ids.map((i) => `wd:${i}`).join(' ')} } ?c rdfs:label ?l . FILTER(LANG(?l) = "en") }`;
};

/** The snapshot object. `catalogueNdbs` is a Set of five-digit NDB numbers of the catalogue. */
export const buildSnapshot = (items, classLabels, catalogueNdbs, date, query) => {
  const perItem = new Map();
  for (const b of items) {
    const key = normaliseNdb(value(b.ndb));
    if (key === undefined) continue;
    perItem.set(qid(value(b.item)), (perItem.get(qid(value(b.item))) ?? new Set()).add(key));
  }
  const rows = [];
  for (const b of items) {
    const key = normaliseNdb(value(b.ndb));
    if (key === undefined || !catalogueNdbs.has(key)) continue;
    const item = qid(value(b.item));
    rows.push({
      item,
      ndb: value(b.ndb),
      ndbCount: perItem.get(item).size,
      ...(value(b.de) !== undefined ? { de: value(b.de) } : {}),
      deAliases: list(b.deAliases).sort(),
      ...(value(b.en) !== undefined ? { en: value(b.en) } : {}),
      instanceOf: instancesOf(b),
    });
  }
  rows.sort((a, b) => (a.ndb < b.ndb ? -1 : a.ndb > b.ndb ? 1 : a.item < b.item ? -1 : 1));
  const taxonClasses = {};
  for (const [id, label] of Object.entries(classLabels)) {
    if (/taxon$/.test(label)) taxonClasses[id] = label;
  }
  return {
    format: 'culina-wikidata-de-snapshot',
    formatVersion: 1,
    source: 'Wikidata, https://query.wikidata.org/sparql (CC0 1.0 Universal)',
    retrieved: date,
    property: 'P1978 (USDA NDB number)',
    query,
    classesQuery:
      'SELECT ?c ?l WHERE { VALUES ?c { <the class ids of the P31 values of the first response> } ?c rdfs:label ?l . FILTER(LANG(?l) = "en") }',
    taxonClasses: Object.fromEntries(Object.entries(taxonClasses).sort()),
    responseRows: items.length,
    keptRows: rows.length,
    items: rows,
  };
};

/** One row per line, so diffs stay readable. */
export const serialiseSnapshot = (snapshot) => {
  const { items, ...head } = snapshot;
  const top = JSON.stringify(head, null, 2).slice(0, -2);
  return `${top},\n  "items": [\n${items.map((r) => `    ${JSON.stringify(r)}`).join(',\n')}\n  ]\n}\n`;
};

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const main = () => {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === 'classes-query' && rest[0] !== undefined) {
    console.log(classesQuery(readJson(rest[0]).results.bindings));
    return;
  }
  if (mode === 'build' && rest.length >= 4) {
    const [itemsFile, classesFile, datasetFile, date] = rest;
    const outAt = rest.indexOf('--out');
    const out = outAt === -1 ? defaultOut : rest[outAt + 1];
    const classLabels = {};
    for (const b of readJson(classesFile).results.bindings)
      classLabels[qid(value(b.c))] = value(b.l);
    const foods = readJson(datasetFile).SRLegacyFoods;
    const inCatalogue = new Set(buildRows(foods, '0').map((r) => r['x-fdc'].id));
    const ndbs = new Set(
      foods
        .filter((f) => inCatalogue.has(f.fdcId))
        .map((f) => normaliseNdb(f.ndbNumber))
        .filter((n) => n !== undefined),
    );
    const query = readFileSync(itemsQueryFile, 'utf8').trim();
    const snapshot = buildSnapshot(
      readJson(itemsFile).results.bindings,
      classLabels,
      ndbs,
      date,
      query,
    );
    writeFileSync(out, serialiseSnapshot(snapshot));
    console.log(`${snapshot.keptRows} of ${snapshot.responseRows} rows kept -> ${out}`);
    return;
  }
  console.error('usage: see the comment at the top of tools/catalogue/snapshot.mjs');
  process.exit(2);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
