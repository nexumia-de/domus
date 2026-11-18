// Groups catalogue rows into the ingredient tree: parents from shared leading segments of the
// names, and the numbers a parent can honestly carry. Pure: no file access, no clock. The rules
// are stated in docs/ingredient-catalogue.md (Grouping rule); change both together.
import { createHash } from 'node:crypto';
import { agreedCategory, agreedNames } from './group-names.mjs';

/** A parent has at least this many food rows below it (itself not counted). */
export const MIN_ROWS_BELOW = 2;
/** A parent has at least this many children, else it is left out and its child moves up. */
export const MIN_CHILDREN = 2;
/** Values of the rows below a parent agree when the largest is at most this times the smallest. */
export const AGREEMENT = 1.05;
/**
 * At least this many rows below a parent must have a value before the parent takes one. Every
 * row below must have it: a child without its own value inherits the parent's, so the parent's
 * number must be true of all of them.
 */
export const MIN_VALUES = 2;
/** Longest id the schema allows, and the longest `source` text. */
const MAX_ID = 80;
const MAX_SOURCE = 500;

const segmentsOf = (name) => name.split(', ');

/** The id of a parent: "fdc-group-" and the name as a lower-case ASCII slug; see the docs. */
export const groupIdOf = (name) => {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const id = `fdc-group-${slug}`;
  return id.length <= MAX_ID ? id : `${id.slice(0, MAX_ID - 9).replace(/-+$/, '')}-${hash(name)}`;
};

const hash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 8);

const round3 = (value) => Number(value.toFixed(3));

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * The value a parent takes from `members` (all food rows below it), or undefined.
 * `label` names the field in the source text.
 */
const agreed = (members, field, label) => {
  // `members` are all the food rows below the parent.
  const have = members.filter((row) => row[field] !== undefined);
  if (have.length < MIN_VALUES || have.length < members.length) return undefined;
  const values = have.map((row) => row[field].value);
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  if (highest / lowest > AGREEMENT) return undefined;
  const ids = have.map((row) => row['x-fdc'].id).join(', ');
  const source = `Derived by tools/catalogue/build.mjs: all ${have.length} rows below with a ${label} agree (largest / smallest = ${round3(highest / lowest)}, at most ${AGREEMENT}); value = median ${round3(median(values))} of ${lowest} to ${highest}; FDC IDs ${ids}`;
  if (source.length > MAX_SOURCE) return undefined;
  return { value: round3(median(values)), source };
};

/**
 * Adds `parentId` to the food rows and returns them with the parents, sorted by id. A parent is a
 * leading run of segments (split at ", ") of at least MIN_ROWS_BELOW names, or a row whose own
 * name is such a run; a parent left with fewer than MIN_CHILDREN children is dropped.
 */
export const groupRows = (foodRows) => {
  const rowByName = new Map(foodRows.map((row) => [row.name, row]));
  const below = new Map();
  for (const row of foodRows) {
    const parts = segmentsOf(row.name);
    for (let k = 1; k < parts.length; k++) {
      const prefix = parts.slice(0, k).join(', ');
      below.set(prefix, (below.get(prefix) ?? 0) + 1);
    }
  }
  const nodes = new Set(foodRows.map((row) => row.name));
  for (const [prefix, count] of below) if (count >= MIN_ROWS_BELOW) nodes.add(prefix);

  const parentOf = (name) => {
    const parts = segmentsOf(name);
    for (let k = parts.length - 1; k >= 1; k--) {
      const prefix = parts.slice(0, k).join(', ');
      if (nodes.has(prefix)) return prefix;
    }
    return undefined;
  };
  // A synthetic parent with fewer than MIN_CHILDREN children is dropped; its child moves up.
  for (let changed = true; changed;) {
    changed = false;
    const children = new Map();
    for (const name of nodes) {
      const parent = parentOf(name);
      if (parent !== undefined) children.set(parent, (children.get(parent) ?? 0) + 1);
    }
    for (const name of [...nodes]) {
      if (!rowByName.has(name) && (children.get(name) ?? 0) < MIN_CHILDREN) {
        nodes.delete(name);
        changed = true;
      }
    }
  }

  const idOf = (name) => rowByName.get(name)?.id ?? groupIdOf(name);
  const membersOf = new Map();
  for (const row of foodRows) {
    for (let p = parentOf(row.name); p !== undefined; p = parentOf(p)) {
      membersOf.set(p, [...(membersOf.get(p) ?? []), row]);
    }
  }
  const out = foodRows.map((row) => {
    const parent = parentOf(row.name);
    if (parent === undefined) return row;
    const { id, name, ...rest } = row;
    return { id, name, parentId: idOf(parent), ...rest };
  });
  for (const name of nodes) {
    if (rowByName.has(name)) continue;
    const members = membersOf.get(name);
    const parent = parentOf(name);
    const group = { id: groupIdOf(name), name };
    if (parent !== undefined) group.parentId = idOf(parent);
    const names = agreedNames(members);
    if (names !== undefined) group.names = names;
    const density = agreed(members, 'densityGPerMl', 'density');
    const piece = agreed(members, 'unitWeightG', 'unit weight');
    if (density !== undefined) group.densityGPerMl = density;
    if (piece !== undefined) group.unitWeightG = piece;
    const category = agreedCategory(members);
    group['x-group'] = { rows: members.length, ...(category !== undefined ? { category } : {}) };
    out.push(group);
  }
  const ids = new Set(out.map((row) => row.id));
  if (ids.size !== out.length) throw new Error('two catalogue entries share an id');
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
};
