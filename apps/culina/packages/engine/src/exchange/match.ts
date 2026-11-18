// Proposes existing ingredients for names read from a file. No fuzzy scoring: two rules that
// each fit in a sentence (see `normaliseName` and `NameMatch`).
import { ancestors, buildTree } from '../model';

/** An ingredient the importer may point a name at. `origin` says where it comes from. */
export interface Candidate {
  id: string;
  name: string;
  /** `notebook` today; a shipped catalogue later. Not read by the rules. */
  origin: string;
  parentId?: string;
}

/**
 * What the importer proposes for one name.
 * - `exact`: the first candidate (in list order) whose normalised name equals the name's.
 * - `close`: other candidates (also a second one of the same name) whose words all occur in the name, or the name's words all occur
 *   in theirs, best overlap first (shared words over all words), at most five.
 * - `classes`: the ancestors in the candidates' tree of the exact and close matches, nearest
 *   first, that are not listed above, at most five: a name may be filed under its class.
 */
export interface NameMatch {
  name: string;
  exact?: Candidate;
  close: Candidate[];
  classes: Candidate[];
}

const LIMIT = 5;

/** One word to its singular: ies to y, oes to o, (s, x, z, ch, sh) + es to the stem, else a final s unless it follows s, u or i. */
const singular = (word: string): string => {
  if (word.length > 3 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith('oes')) return word.slice(0, -2);
  if (word.length > 3 && /(s|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 2 && word.endsWith('s') && !/(s|u|i)s$/.test(word)) return word.slice(0, -1);
  return word;
};

/** The words of a name: lower case, split at anything that is no letter or digit, each in the singular. */
export const nameWords = (name: string): string[] =>
  name
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w !== '')
    .map(singular);

/** The comparison form of a name: its words, in order, joined by one space. */
export const normaliseName = (name: string): string => nameWords(name).join(' ');

const overlap = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
};

const subset = (small: ReadonlySet<string>, big: ReadonlySet<string>): boolean => {
  for (const w of small) if (!big.has(w)) return false;
  return small.size > 0;
};

/** Ancestors of `id` in the candidates' tree; a parent that is no candidate ends the chain. */
const ancestorIds = (candidates: readonly Candidate[]): ((id: string) => string[]) => {
  const unique = new Map<string, Candidate>();
  for (const c of candidates) if (!unique.has(c.id)) unique.set(c.id, c);
  const list = [...unique.values()].map((c) => ({
    id: c.id,
    name: c.name,
    level: 'type' as const,
    ...(c.parentId !== undefined && unique.has(c.parentId) ? { parentId: c.parentId } : {}),
  }));
  const tree = buildTree(list);
  return (id) => (tree.ok ? (ancestors(tree.tree, id) ?? []) : []);
};

/**
 * @param names - Names as written in the file.
 * @param candidates - Ingredients to point at, the notebook's first.
 * @returns One `NameMatch` per name, in order.
 */
export function matchIngredients(
  names: readonly string[],
  candidates: readonly Candidate[],
): NameMatch[] {
  const prepared = candidates.map((c, order) => ({
    c,
    order,
    text: normaliseName(c.name),
    words: new Set(nameWords(c.name)),
  }));
  const up = ancestorIds(candidates);
  const byId = new Map<string, Candidate>();
  for (const c of candidates) if (!byId.has(c.id)) byId.set(c.id, c);

  return names.map((name) => {
    const text = normaliseName(name);
    const words = new Set(nameWords(name));
    const exactEntry = prepared.find((p) => p.text === text && text !== '');
    const close = prepared
      .filter((p) => p !== exactEntry && p.c.id !== exactEntry?.c.id)
      .filter((p) => subset(p.words, words) || subset(words, p.words))
      .map((p) => ({ p, score: overlap(words, p.words) }))
      .sort((a, b) => b.score - a.score || a.p.order - b.p.order)
      .filter((x, i, all) => all.findIndex((y) => y.p.c.id === x.p.c.id) === i)
      .slice(0, LIMIT)
      .map((x) => x.p.c);
    const listed = new Set([exactEntry?.c.id, ...close.map((c) => c.id)]);
    const classes: Candidate[] = [];
    for (const from of [exactEntry?.c, ...close]) {
      if (from === undefined) continue;
      for (const id of up(from.id)) {
        const found = byId.get(id);
        if (found !== undefined && !listed.has(id) && classes.length < LIMIT) {
          listed.add(id);
          classes.push(found);
        }
      }
    }
    return { name, ...(exactEntry === undefined ? {} : { exact: exactEntry.c }), close, classes };
  });
}
