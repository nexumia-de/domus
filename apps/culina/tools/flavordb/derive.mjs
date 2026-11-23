// Turns FlavorDB's entity documents into the pairing data the app reads. Pure: no file, no
// network, no clock; build.mjs does the reading and writing. What is kept of an entity: its id,
// names, category and the PubChem ids of its molecules; of a molecule: its name and its flavour
// words. Everything else of the documents (structures, masses, registry numbers) is left out.
// Data: CC BY-NC-SA 3.0, see docs/decisions/flavordb.md.

export const FORMAT = 'culina-flavour-pairings';
export const FORMAT_VERSION = 1;
export const LICENCE = 'CC-BY-NC-SA-3.0';
export const CITATION =
  'Garg N, Sethupathy A, Tuwani R, NK R, Dokania S, Iyer A, Gupta A, Agrawal S, Singh N, Shukla S, Kathuria K, Badhwar R, Kanji R, Jain A, Kaur A, Nagpal R, Bagler G. FlavorDB: a database of flavor molecules. Nucleic Acids Research, gkx957 (2017). doi:10.1093/nar/gkx957';

const text = (v) => (typeof v === 'string' ? v.trim() : '');

/** The flavour words of a molecule: FlavorDB's `flavor_profile`, split at "@", lower case, sorted, once each. */
export function flavourWords(profile) {
  const words = text(profile)
    .split('@')
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w !== '');
  return [...new Set(words)].sort();
}

/** The synonyms of an entity besides its readable name, as written, once each. */
export function synonymsOf(doc) {
  const name = text(doc.entity_alias_readable);
  const seen = new Set([name.toLowerCase()]);
  const out = [];
  for (const s of text(doc.entity_alias_synonyms).split(',')) {
    const t = s.trim();
    if (t === '' || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out;
}

/**
 * One entity of the output, or a reason why the document is not one.
 * @returns `{ entity, molecules }` with the molecules as `[pubchemId, { name, flavours }]`, or `{ error }`.
 */
export function deriveEntity(doc) {
  if (doc === null || typeof doc !== 'object') return { error: 'not an object' };
  if (!Number.isInteger(doc.entity_id) || doc.entity_id < 0) return { error: 'no entity_id' };
  const name = text(doc.entity_alias_readable);
  if (name === '') return { error: 'no name' };
  if (!Array.isArray(doc.molecules)) return { error: 'no molecules' };
  const molecules = new Map();
  for (const m of doc.molecules) {
    if (!Number.isInteger(m?.pubchem_id) || m.pubchem_id <= 0)
      return { error: 'a molecule without pubchem_id' };
    molecules.set(m.pubchem_id, {
      name: text(m.common_name),
      flavours: flavourWords(m.flavor_profile),
    });
  }
  const entity = {
    id: doc.entity_id,
    alias: text(doc.entity_alias),
    name,
    category: text(doc.category),
    molecules: [...molecules.keys()].sort((a, b) => a - b),
  };
  const synonyms = synonymsOf(doc);
  if (synonyms.length > 0) entity.synonyms = synonyms;
  return { entity, molecules: [...molecules] };
}

/**
 * The whole file from the entity documents. The same documents give the same bytes: entities by
 * id, molecules by PubChem id. A molecule that two entities describe differently keeps the
 * description of the entity with the lower id, and the difference is counted.
 * @param meta `{ fetched }`, the date the documents were fetched (YYYY-MM-DD).
 * @returns `{ data, problems }`; a document that is no entity is a problem and is left out.
 */
export function deriveDataset(docs, meta) {
  const problems = [];
  const entities = [];
  const molecules = new Map();
  let differing = 0;
  const seen = new Set();
  const sorted = [...docs].sort((a, b) => (a?.entity_id ?? 0) - (b?.entity_id ?? 0));
  for (const doc of sorted) {
    const result = deriveEntity(doc);
    if (result.error) {
      problems.push(`entity ${doc?.entity_id ?? '?'}: ${result.error}`);
      continue;
    }
    if (seen.has(result.entity.id)) {
      problems.push(`entity ${result.entity.id}: twice`);
      continue;
    }
    seen.add(result.entity.id);
    entities.push(result.entity);
    for (const [id, molecule] of result.molecules) {
      const known = molecules.get(id);
      if (!known) molecules.set(id, molecule);
      else if (JSON.stringify(known) !== JSON.stringify(molecule)) differing += 1;
    }
  }
  if (differing > 0) problems.push(`${differing} molecule descriptions differ between entities`);
  const data = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    dataset: {
      name: 'FlavorDB',
      url: 'https://cosylab.iiitd.edu.in/flavordb2/',
      licence: LICENCE,
      citation: CITATION,
      fetched: meta.fetched,
      changes:
        'Of each entity: id, names, category and the PubChem ids of its molecules. Of each molecule: name and flavour words. All else left out.',
    },
    entities,
    molecules: Object.fromEntries([...molecules].sort((a, b) => a[0] - b[0])),
  };
  return { data, problems };
}
