// "Proven together": the project's own table of which ingredients cooks commonly combine
// (data/affinities.json, written by an AI model, docs/decisions/own-recipes.md), read for the
// ingredients of a dish. A pair holds in both directions. An ingredient stands for itself or for
// its nearest ancestor that the table names, so the user's own tomato under "Tomatoes" counts as
// tomato. Pure but for the names it is given; the table is part of the bundle, nothing is fetched.
import file from '../../data/affinities.json';
import type { PairingLine, PairingNames, PairingRow } from './view';

export type AffinityTable = ReadonlyMap<string, readonly string[]>;

/** The pairs of a file in both directions: a row's own partners first, in the file's order. */
export function affinityTable(pairs: Readonly<Record<string, readonly string[]>>): AffinityTable {
  const table = new Map<string, string[]>();
  const add = (a: string, b: string): void => {
    const row = table.get(a) ?? [];
    if (!row.includes(b)) row.push(b);
    table.set(a, row);
  };
  for (const [a, partners] of Object.entries(pairs)) for (const b of partners) add(a, b);
  for (const [a, partners] of Object.entries(pairs)) for (const b of partners) add(b, a);
  return table;
}

/** The shipped table. */
export const AFFINITIES: AffinityTable = affinityTable(file.pairs);

/** How many ingredients the list offers. */
export const AFFINITY_ROWS = 8;
/** How many of the dish's ingredients a row names. */
const WITH_NAMES = 3;

/** The id and its ancestors, the id first. */
export const chainOf = (id: string, parentOf: PairingNames['parentOf']): string[] => {
  const chain: string[] = [];
  for (let at: string | undefined = id; at !== undefined && !chain.includes(at); at = parentOf(at))
    chain.push(at);
  return chain;
};

/** The nearest of the id and its ancestors that the table names. */
const tableKey = (
  id: string,
  table: AffinityTable,
  parentOf: PairingNames['parentOf'],
): string | undefined => chainOf(id, parentOf).find((at) => table.has(at));

/**
 * Whether the table pairs an ingredient with a line's ingredient: the line stands for its nearest
 * ingredient the table names (as in `affinityRows`), the ingredient for itself or an ancestor.
 */
export function provenWith(
  ingredient: string,
  line: string,
  table: AffinityTable,
  parentOf: PairingNames['parentOf'],
): boolean {
  const key = tableKey(line, table, parentOf);
  const partners = key === undefined ? undefined : table.get(key);
  return (
    partners !== undefined && chainOf(ingredient, parentOf).some((id) => partners.includes(id))
  );
}

/**
 * What goes with the lines of a dish: the partners of each line, those most lines name first,
 * then in the order met. Nothing that is in the dish, as itself, as its group or as a member of it.
 */
export function affinityRows(
  lines: readonly PairingLine[],
  table: AffinityTable,
  names: PairingNames,
  limit: number = AFFINITY_ROWS,
): PairingRow[] {
  const inDish = new Set(lines.flatMap((l) => chainOf(l.ingredient, names.parentOf)));
  const found = new Map<string, string[]>();
  const counted = new Set<string>();
  for (const line of lines) {
    const key = tableKey(line.ingredient, table, names.parentOf);
    // Two lines that stand for the same ingredient count once.
    if (key === undefined || counted.has(key)) continue;
    counted.add(key);
    for (const partner of table.get(key) ?? []) {
      if (chainOf(partner, names.parentOf).some((id) => inDish.has(id))) continue;
      found.set(partner, [...(found.get(partner) ?? []), line.name]);
    }
  }
  return [...found.entries()]
    .map(([ingredient, withNames], index) => ({ ingredient, withNames, index }))
    .sort((a, b) => b.withNames.length - a.withNames.length || a.index - b.index)
    .slice(0, limit)
    .map(({ ingredient, withNames }) => ({
      ingredient,
      name: names.nameOf(ingredient),
      with: withNames.slice(0, WITH_NAMES),
    }));
}
