// The project's own German names for catalogue entries (a hand-kept overlay) and how they are
// merged. Pure. Rules in docs/ingredient-catalogue.md (German names, own translation); change
// both together.

/** The date of the translation, as in the overlay's head and in every merged `source`. */
export const OWN_SOURCE_PREFIX = 'Own translation';

/** The `source` text of a merged entry. */
export const ownSource = (date) =>
  `${OWN_SOURCE_PREFIX} of the USDA description by the project, ${date}`;

/** Whether a `names.de` entry is one of ours (and so may be replaced when the overlay changes). */
export const isOwnName = (entry) => entry?.source?.startsWith(OWN_SOURCE_PREFIX) === true;

/**
 * Entries with the overlay's German names added. An entry that has a German name from another
 * source (Wikidata) is never changed; an entry with an earlier own translation takes the overlay's
 * current one; an overlay id the catalogue does not have is reported. Returns the new list and
 * the counts; the input is not changed.
 */
export const mergeOwnNames = (ingredients, overlay) => {
  const known = new Set(ingredients.map((row) => row.id));
  const unknown = Object.keys(overlay.names).filter((id) => !known.has(id));
  let merged = 0;
  let keptOther = 0;
  const source = ownSource(overlay.dataset.date);
  const rows = ingredients.map((row) => {
    const own = overlay.names[row.id];
    if (own === undefined) return row;
    const have = row.names?.de;
    if (have !== undefined && !isOwnName(have)) {
      keptOther += 1;
      return row;
    }
    merged += 1;
    const de = {
      name: own.name,
      ...(own.aliases !== undefined && own.aliases.length > 0 ? { aliases: own.aliases } : {}),
      source,
    };
    return { ...row, names: { ...row.names, de } };
  });
  return { ingredients: rows, merged, keptOther, unknown };
};

/** The envelope's description of the overlay, with the SHA-256 of the file read. */
export const ownNamesDataset = (overlay, sha256) => ({
  name: overlay.dataset.name,
  file: overlay.dataset.file,
  sha256,
  retrieved: overlay.dataset.date,
  licence: overlay.dataset.licence,
});
