// The stock tree as a view model: nodes with their counts, and the flat
// list of rows to draw for a search, a "show" choice and the expanded
// groups. Pure. Counts are over leaves, the things one buys: "11 of 18".

import type { IngredientTree, Level } from '@mixtura/engine';
import { normalise } from '../browse/normalise';
import { batchDates } from '../../stock/batches';
import type { StockRecords } from '../../stock/state';

export const OTHER_ID = '__other';

export interface StockNode {
  id: string;
  name: string;
  level: Level | 'group';
  children: StockNode[];
  /** Leaves at or below this node, and how many of them are marked in stock. */
  leaves: number;
  marked: number;
  present: boolean;
  /** A record exists: `present` false then means known to be out. */
  tracked: boolean;
  /** Drinks that name this ingredient or something below it. */
  drinks: number;
  /** A prepared ingredient: its batches can be recorded. */
  prepared: boolean;
  /** Batches at hand (made-on dates), 0 for anything but a prepared ingredient at hand. */
  batches: number;
  /** Names of the ticked spaces that have it present; empty unless more than one space counts. */
  spaces: readonly string[];
  /** The synthetic group of top-level ingredients without children; it cannot be marked. */
  synthetic: boolean;
}

export type Show = 'all' | 'in' | 'out';

const byName = (a: { name: string }, b: { name: string }): number =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });

export function buildStockTree(
  tree: IngredientTree,
  records: StockRecords,
  drinks: ReadonlyMap<string, number>,
  otherName: string,
  presentAt: ReadonlyMap<string, readonly string[]> = new Map(),
): StockNode[] {
  const make = (id: string): StockNode => {
    const ingredient = tree.byId.get(id);
    const children = (tree.children.get(id) ?? []).map(make).sort(byName);
    const record = records.get(id);
    const isLeaf = children.length === 0;
    const present = record?.present === true;
    return {
      id,
      name: ingredient?.name ?? id,
      level: ingredient?.level ?? 'product',
      children,
      leaves: isLeaf ? 1 : children.reduce((n, c) => n + c.leaves, 0),
      marked: isLeaf ? (present ? 1 : 0) : children.reduce((n, c) => n + c.marked, 0),
      present,
      tracked: record !== undefined,
      drinks: drinks.get(id) ?? 0,
      prepared: ingredient?.prepared !== undefined,
      batches: ingredient?.prepared ? batchDates(record).length : 0,
      spaces: presentAt.get(id) ?? [],
      synthetic: false,
    };
  };
  const roots = tree.ids.filter((id) => !tree.byId.get(id)?.parentId).map(make);
  const groups = roots.filter((n) => n.children.length > 0).sort(byName);
  const single = roots.filter((n) => n.children.length === 0).sort(byName);
  if (single.length > 0) {
    groups.push({
      id: OTHER_ID,
      name: otherName,
      level: 'group',
      children: single,
      leaves: single.length,
      marked: single.filter((n) => n.present).length,
      present: false,
      tracked: false,
      drinks: 0,
      prepared: false,
      batches: 0,
      spaces: [],
      synthetic: true,
    });
  }
  return groups;
}

export interface Row {
  node: StockNode;
  depth: number;
  /** Null for a node without children; else whether its children are listed. */
  expanded: boolean | null;
  parentId: string | null;
}

export interface ViewOptions {
  q: string;
  show: Show;
  expanded: ReadonlySet<string>;
}

/** Whether the tree is narrowed: groups then open by themselves. */
export const isNarrowed = ({ q, show }: Pick<ViewOptions, 'q' | 'show'>): boolean =>
  q !== '' || show !== 'all';

const words = (q: string): string[] => normalise(q).split(' ').filter(Boolean);

const nameHit = (node: StockNode, needles: string[]): boolean => {
  const text = normalise(node.name);
  return needles.every((w) => text.includes(w));
};

const showOk = (node: StockNode, show: Show): boolean =>
  node.synthetic ? true : show === 'all' || (show === 'in') === node.present;

export interface View {
  rows: Row[];
  /** Rows that match on their own (name and show), in order. */
  matches: StockNode[];
}

/** The rows to draw. A match shows its ancestors and, when its name matched, everything below it. */
export function viewRows(roots: readonly StockNode[], options: ViewOptions): View {
  const needles = words(options.q);
  const narrowed = isNarrowed(options);
  const rows: Row[] = [];
  const matches: StockNode[] = [];

  const visit = (node: StockNode, depth: number, parentId: string | null, hit: boolean): Row[] => {
    const hitHere = hit || (needles.length > 0 && nameHit(node, needles));
    const own = !node.synthetic && (needles.length === 0 || hitHere) && showOk(node, options.show);
    const below: Row[] = [];
    const before = matches.length;
    for (const child of node.children) below.push(...visit(child, depth + 1, node.id, hitHere));
    const childMatched = matches.length > before;
    if (own) matches.splice(before, 0, node);
    if (!own && !childMatched) return [];
    const hasChildren = node.children.length > 0;
    const open = hasChildren && (narrowed ? childMatched || own : options.expanded.has(node.id));
    const row: Row = { node, depth, expanded: hasChildren ? open : null, parentId };
    return open ? [row, ...below] : [row];
  };
  for (const root of roots) rows.push(...visit(root, 0, null, false));
  return { rows, matches };
}

/** The first match for quick entry: an exact name, then a name that starts with the text, then the first. */
export function firstMatch(roots: readonly StockNode[], q: string): StockNode | undefined {
  const { matches } = viewRows(roots, { q, show: 'all', expanded: new Set() });
  const text = normalise(q);
  return (
    matches.find((n) => normalise(n.name) === text) ??
    matches.find((n) => normalise(n.name).startsWith(text)) ??
    matches[0]
  );
}

/** What "Mark All Visible" acts on: matching nodes that have no children (what one buys), not yet marked. */
export const markTargets = (matches: readonly StockNode[]): StockNode[] =>
  matches.filter((n) => n.children.length === 0 && !n.synthetic && !n.present);

/** What "Clear Visible" acts on: every matching node that is marked, whatever its level. */
export const clearTargets = (matches: readonly StockNode[]): StockNode[] =>
  matches.filter((n) => n.present);

/** Ingredients marked in stock that the tree knows, any level. */
export function countPresent(roots: readonly StockNode[]): number {
  const walk = (n: StockNode): number =>
    (n.present ? 1 : 0) + n.children.reduce((s, c) => s + walk(c), 0);
  return roots.reduce((s, r) => s + walk(r), 0);
}
