// What a generated parent takes from the food rows below it besides numbers: a name per language
// and USDA's food category. Pure. Rules in docs/ingredient-catalogue.md (German names, Food
// category); change both together.

const MAX_SOURCE = 500;
const MIN_ROWS = 2;

/** The Wikidata item ids a row's names cite, from the `source` texts that name them. */
const itemsOf = (row, lang) =>
  [/Wikidata (Q\d+)/.exec(row.names?.[lang]?.source ?? '')?.[1]].filter((x) => x !== undefined);

/**
 * The names a parent takes: for a language, when every food row below has a name in it, there are
 * at least MIN_ROWS rows, and all the names are the same. The parent has no aliases. Its `source`
 * names the rule and every Wikidata item; a source too long for the schema leaves the name out.
 */
export const agreedNames = (members) => {
  const names = {};
  const languages = new Set(members.flatMap((row) => Object.keys(row.names ?? {})));
  for (const lang of [...languages].sort()) {
    const have = members.map((row) => row.names?.[lang]?.name);
    if (have.length < MIN_ROWS || have.some((n) => n === undefined) || new Set(have).size !== 1) {
      continue;
    }
    const items = [...new Set(members.flatMap((row) => itemsOf(row, lang)))].sort();
    const source = `Derived by tools/catalogue/build.mjs: all ${have.length} rows below have the ${lang} name "${have[0]}"; Wikidata ${items.join(', ')}`;
    if (source.length > MAX_SOURCE) continue;
    names[lang] = { name: have[0], source };
  }
  return Object.keys(names).length > 0 ? names : undefined;
};

/** USDA's food category when every food row below has the same one. */
export const agreedCategory = (members) => {
  const categories = new Set(members.map((row) => row['x-fdc']?.category));
  const [only] = categories;
  return categories.size === 1 && only !== undefined ? only : undefined;
};
