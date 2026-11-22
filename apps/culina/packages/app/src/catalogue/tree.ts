// The catalogue as a tree: parents (generated groups and foods with variants) above their variants.
// Pure: the picker draws what these functions return. An entry whose parent is not in the file is
// a root, so a file that is cut or out of date still lists everything.
import type { IngredientRecord } from '../records';
import { fold, matchesAnyName, searchableNames, startsWithAnyName } from '../shared/names';

export interface CatalogueNode {
  entry: IngredientRecord;
  children: CatalogueNode[];
}

/** The roots of the catalogue, children in the order of `entries` (the file sorts by name). */
export const catalogueTree = (entries: readonly IngredientRecord[]): CatalogueNode[] => {
  const nodes = new Map(
    entries.map((entry) => [entry.id, { entry, children: [] } as CatalogueNode]),
  );
  const roots: CatalogueNode[] = [];
  for (const entry of entries) {
    const node = nodes.get(entry.id) as CatalogueNode;
    const parent = entry.parentId === undefined ? undefined : nodes.get(entry.parentId);
    // A parent link that leads to itself is ignored; longer loops are cut by `chainOf`.
    if (parent === undefined || parent === node) roots.push(node);
    else parent.children.push(node);
  }
  return roots;
};

/** The entries above `entry`, the root first, `entry` not included; stops at an unknown parent. */
export const chainOf = (
  entry: IngredientRecord,
  byId: ReadonlyMap<string, IngredientRecord>,
): IngredientRecord[] => {
  const chain: IngredientRecord[] = [];
  const seen = new Set([entry.id]);
  for (
    let parent = entry.parentId === undefined ? undefined : byId.get(entry.parentId);
    parent !== undefined && !seen.has(parent.id);
    parent = parent.parentId === undefined ? undefined : byId.get(parent.parentId)
  ) {
    seen.add(parent.id);
    chain.unshift(parent);
  }
  return chain;
};

/** One node of a search result: a hit, or an ancestor shown only on the way to a hit. */
export interface Found {
  entry: IngredientRecord;
  /** The entry itself is a hit: it matches the text and is offered. */
  hit: boolean;
  children: Found[];
  /** How many entries are below this one in the result. */
  below: number;
}

/**
 * The part of the tree that matches `needle` (a name or alias in any language contains it, ignoring
 * case and accents, see shared/names): hits, and the
 * ancestors that lead to them. `offered` says whether an entry may be a hit (the ones in the
 * notebook are not). An empty needle matches nothing.
 */
export const searchTree = (
  roots: readonly CatalogueNode[],
  needle: string,
  offered: (entry: IngredientRecord) => boolean,
): Found[] => {
  const text = needle.trim();
  if (text === '') return [];
  const visit = (node: CatalogueNode): Found | undefined => {
    const children = node.children.flatMap((child) => visit(child) ?? []);
    const hit = offered(node.entry) && matchesAnyName(node.entry, text);
    if (!hit && children.length === 0) return undefined;
    const below = children.reduce((sum, child) => sum + 1 + child.below, 0);
    return { entry: node.entry, hit, children, below };
  };
  return roots.flatMap((root) => visit(root) ?? []);
};

/**
 * The top-level results in the order the picker offers them: an entry with a name that is the
 * search text itself first ("Kartoffel" is the potato, not potato flour), then entries with a name
 * that starts with it, then the rest; the file's order within each.
 */
export const rankFound = (found: readonly Found[], needle: string): Found[] => {
  const text = fold(needle.trim());
  const rank = (f: Found): number =>
    f.hit && searchableNames(f.entry).some((n) => fold(n.name) === text)
      ? 0
      : startsWithAnyName(f.entry, needle.trim())
        ? 1
        : 2;
  return [0, 1, 2].flatMap((r) => found.filter((f) => rank(f) === r));
};

/** The name without the parent's name in front: "white" for "Wheat flour, white" under "Wheat flour". */
export const shortName = (entry: IngredientRecord, parent: IngredientRecord | undefined): string =>
  parent !== undefined && entry.name.startsWith(`${parent.name}, `)
    ? entry.name.slice(parent.name.length + 2)
    : entry.name;
