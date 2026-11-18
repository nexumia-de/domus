// Yields from the refuse percentage of USDA's SR28 ASCII file FOOD_DES.txt. Pure: the file's text
// comes in as a string. Rules in docs/ingredient-catalogue.md (Yields); change both together.

/** Where the refuse data comes from, for the envelope and for every yield's source text. */
export const REFUSE_SOURCE =
  'USDA FoodData Central, SR Legacy archive SR28 (sr28asc.zip), FOOD_DES.txt';

const strip = (text) => text.replace(/^~|~$/g, '');
const bare = (description) =>
  description
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Reads FOOD_DES.txt (fields separated by ^, text in ~): a Map from the NDB number (five digits)
 * to { description, refuse, refuseDescription } for every line that gives a refuse above zero.
 */
export const readRefuse = (text) => {
  const found = new Map();
  for (const line of text.split('\n')) {
    const cells = line.replace(/\r$/, '').split('^').map(strip);
    if (cells.length < 9) continue;
    const refuse = Number(cells[8]);
    if (!(refuse > 0 && refuse < 100)) continue;
    found.set(cells[0], { description: cells[2], refuse, refuseDescription: cells[7] });
  }
  return found;
};

/**
 * The yield entries of one food, or undefined: the NDB number must be in `refuse` and the food's
 * description, without parentheses, must equal SR28's. The state is raw (the selection leaves out
 * cooked and prepared foods); yield % = 100 - refuse %.
 */
export const deriveYields = (food, refuse) => {
  const entry = refuse.get(String(food.ndbNumber).padStart(5, '0'));
  if (entry === undefined || bare(entry.description) !== bare(food.description)) return undefined;
  const what = entry.refuseDescription === '' ? '' : `, Ref_desc "${entry.refuseDescription}"`;
  return [
    {
      state: 'raw',
      percent: 100 - entry.refuse,
      source: `${REFUSE_SOURCE}, NDB_No ${String(food.ndbNumber).padStart(5, '0')} (FDC ID ${food.fdcId}): Refuse ${entry.refuse} %${what}; yield = 100 - ${entry.refuse}`,
    },
  ];
};
