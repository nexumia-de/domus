// Links the catalogue's ingredients to the entities of the pairing data, by name. Pure: no file,
// no network; link-build.mjs reads and writes. A link is a judgement of this project, not part of
// FlavorDB: the catalogue names foods as the USDA does ("Tomatoes, red, ripe, raw"), FlavorDB by
// one word ("Tomato"). The rule tries, in this order, the whole name, the second part with the
// first ("Beans, kidney" as "kidney bean"), the second part alone when the first is a container
// word ("Spices, cinnamon"), and the first part; a text that names exactly one entity links, any
// other does not. links-own.json corrects the rule where it is wrong or silent.

/** First parts that name a kind of food, not a food: the second part says which. */
export const CONTAINERS = new Set([
  'spice',
  'oil',
  'vegetable oil',
  'seed',
  'nut',
  'fish',
  'crustacean',
  'mollusk',
  'alcoholic beverage',
  'bean',
  'pepper',
  'squash',
  'game meat',
  'cereal',
  'beverage',
]);

const singular = (word) => {
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(ch|sh|x|ss|to|ato)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
};

/** A name as the rule compares it: lower case, letters only, each word singular. */
export const keyOf = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w !== '')
    .map(singular)
    .join(' ');

/** The texts tried for a catalogue name, in order. */
export function keysFor(name) {
  const parts = name.split(',').map((p) => keyOf(p));
  const [first = '', second] = parts;
  const keys = [keyOf(name)];
  if (second) {
    keys.push(`${second} ${first}`);
    if (CONTAINERS.has(first)) keys.push(second);
  }
  if (!CONTAINERS.has(first)) keys.push(first);
  return [...new Set(keys.filter((k) => k !== ''))];
}

/** The first `n` comma parts of a name, as one key. */
const prefixKey = (name, n) => keyOf(name.split(',').slice(0, n).join(' '));

/**
 * The links of the catalogue's ingredients.
 * @param own `{ set: [{ name, entity, why, fallback? }] }`. `name` is the beginning of a catalogue
 *   name up to a comma ("Beans, black turtle"); it applies to every ingredient whose name begins
 *   so, the longest beginning first, and goes before the rule. With `fallback` it applies only
 *   where the rule finds nothing. `entity` is an entity's name, or null for "no link".
 * @returns `{ links, problems }`; `links` maps a catalogue id to an entity id, ids ascending.
 */
export function linkCatalogue(ingredients, entities, own = { set: [] }) {
  const problems = [];
  const index = new Map();
  for (const entity of entities) {
    const names = [entity.name, entity.alias.replace(/-/g, ' '), ...(entity.synonyms ?? [])];
    for (const key of new Set(names.map(keyOf))) {
      if (key === '') continue;
      index.set(key, [...(index.get(key) ?? []), entity.id]);
    }
  }
  const byName = new Map(entities.map((e) => [e.name.toLowerCase(), e.id]));
  const first = new Map();
  const fallback = new Map();
  for (const row of own.set) {
    const target = row.entity === null ? null : byName.get(String(row.entity).toLowerCase());
    const key = keyOf(String(row.name ?? '').replace(/,/g, ' '));
    if (target === undefined) problems.push(`links-own: no entity named "${row.entity}"`);
    else if (key === '') problems.push('links-own: a row without name');
    else (row.fallback === true ? fallback : first).set(key, target);
    if (!row.why) problems.push(`links-own: "${row.name}" has no reason`);
  }
  const used = new Set();
  const ownFor = (rows, name) => {
    for (let n = name.split(',').length; n >= 1; n -= 1) {
      const key = prefixKey(name, n);
      if (rows.has(key)) {
        used.add(key);
        return { target: rows.get(key) };
      }
    }
    return undefined;
  };
  const byRule = (name) => {
    for (const key of keysFor(name)) {
      const hits = index.get(key);
      if (hits?.length === 1) return hits[0];
      if (hits) return undefined; // several entities of that name: the rule does not choose
    }
    return undefined;
  };
  const links = {};
  for (const ingredient of [...ingredients].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const chosen = ownFor(first, ingredient.name);
    const target = chosen
      ? chosen.target
      : (byRule(ingredient.name) ?? ownFor(fallback, ingredient.name)?.target ?? null);
    if (target !== null) links[ingredient.id] = target;
  }
  for (const key of [...first.keys(), ...fallback.keys()]) {
    if (!used.has(key)) problems.push(`links-own: "${key}" names no ingredient the rows reach`);
  }
  return { links, problems };
}
