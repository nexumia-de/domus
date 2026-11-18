// German names for catalogue foods from a Wikidata snapshot. Pure: the snapshot (see
// snapshot.mjs, committed as wikidata-de.json) and the foods come in as values; nothing here reads
// a file or the network. Rules in docs/ingredient-catalogue.md (German names); change both together.

/** The language tag of the names this module produces. */
export const LANG = 'de';

/** An NDB number is four or five digits; "1001" and "01001" are the same number, "01001". */
export const normaliseNdb = (value) => {
  const text = String(value ?? '').trim();
  return /^\d{4,5}$/.test(text) ? text.padStart(5, '0') : undefined;
};

/** A scientific name written as a label: a capitalised genus and a lower-case epithet or rank. */
const SCIENTIFIC = /^[A-ZÄÖÜ×][a-zäöüß-]+ (×|[a-z]{3,})/;
export const looksScientific = (label) => SCIENTIFIC.test(label);

/** Lower-case ASCII words of a text, trailing plural endings dropped (pears -> pear). */
export const wordsOf = (text) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w !== '')
    .map((w) =>
      w.length > 3 && w.endsWith('ies')
        ? `${w.slice(0, -3)}y`
        : w.length > 3 && /(ch|sh|x|s|o)es$/.test(w)
          ? w.slice(0, -2)
          : w.length > 3 && w.endsWith('s')
            ? w.slice(0, -1)
            : w,
    );

const bare = (description) => description.replace(/\s*\([^)]*\)/g, '');

/** The English label's words all occur in the description (or the label written as one word does). */
export const labelInDescription = (label, description) => {
  const own = wordsOf(label);
  if (own.length === 0) return false;
  const there = new Set(wordsOf(bare(description)));
  return own.every((w) => there.has(w)) || there.has(own.join(''));
};

/** The label's words are exactly the words of the description's first segment (before the comma). */
export const labelIsFirstSegment = (label, description) => {
  const own = new Set(wordsOf(label));
  const first = new Set(wordsOf(bare(description).split(', ')[0] ?? ''));
  return own.size > 0 && own.size === first.size && [...own].every((w) => first.has(w));
};

/** Aliases without the label itself, scientific names and duplicates, sorted. */
export const cleanAliases = (aliases, label) => {
  const seen = new Set([label.toLowerCase()]);
  const kept = [];
  for (const alias of [...aliases].sort()) {
    const key = alias.toLowerCase();
    if (seen.has(key) || looksScientific(alias) || alias.length > 120) continue;
    seen.add(key);
    kept.push(alias);
  }
  return kept;
};

export const REASONS = [
  'noItem', // no Wikidata item carries the food's NDB number
  'ndbShared', // several items carry it
  'noGerman', // the item has no German label
  'multiNdbBroad', // the item carries several NDB numbers and is not the food's first segment
  'labelMismatch', // the item's English label is not in the food's description
  'taxonScientific', // a taxon whose German label is a scientific name
];

/**
 * The German name of every food that passes the rules, as a Map from FDC id to
 * { item, names: { de: { name, aliases?, source } } }, and the count of foods per outcome.
 * `snapshot` is the parsed wikidata-de.json; foods are { fdcId, ndbNumber, description }.
 */
export const germanNames = (foods, snapshot) => {
  const taxon = new Set(Object.keys(snapshot.taxonClasses));
  const byNdb = new Map();
  for (const row of snapshot.items) {
    const key = normaliseNdb(row.ndb);
    if (key === undefined) continue;
    byNdb.set(key, [...(byNdb.get(key) ?? []), row]);
  }
  const found = new Map();
  const counts = Object.fromEntries(REASONS.map((r) => [r, 0]));
  counts.accepted = 0;
  counts.acceptedTaxon = 0;
  counts.acceptedMultiNdb = 0;
  for (const food of foods) {
    const rows = byNdb.get(normaliseNdb(food.ndbNumber) ?? '') ?? [];
    const items = new Set(rows.map((r) => r.item));
    const skip = (reason) => {
      counts[reason] += 1;
    };
    if (rows.length === 0) {
      skip('noItem');
      continue;
    }
    if (items.size > 1) {
      skip('ndbShared');
      continue;
    }
    const row = rows[0];
    if (row.de === undefined || row.de === '') {
      skip('noGerman');
      continue;
    }
    const multi = row.ndbCount > 1;
    const fits = multi
      ? labelIsFirstSegment(row.en ?? '', food.description)
      : labelInDescription(row.en ?? '', food.description);
    if (!fits) {
      skip(multi ? 'multiNdbBroad' : 'labelMismatch');
      continue;
    }
    const isTaxon = row.instanceOf.some((c) => taxon.has(c));
    if (isTaxon && looksScientific(row.de)) {
      skip('taxonScientific');
      continue;
    }
    const aliases = cleanAliases(row.deAliases ?? [], row.de);
    const entry = {
      name: row.de,
      ...(aliases.length > 0 ? { aliases } : {}),
      source: `Wikidata ${row.item}, label ${LANG}${aliases.length > 0 ? ' and aliases' : ''}, NDB ${row.ndb}, snapshot ${snapshot.retrieved}`,
    };
    found.set(food.fdcId, { item: row.item, taxon: isTaxon, names: { [LANG]: entry } });
    counts.accepted += 1;
    if (isTaxon) counts.acceptedTaxon += 1;
    if (multi) counts.acceptedMultiNdb += 1;
  }
  return { found, counts };
};
