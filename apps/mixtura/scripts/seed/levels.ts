// Level and parent of every ingredient. The level is derived from the
// source tree (root with children: category, other inner node: type, leaf
// or childless root: product). The engine requires a child's level to be
// below its parent's and has three levels, but the source tree is up to
// five deep, so an inner node below another type is attached to its
// nearest ancestor with a higher level; the dropped link is reported.
import type { SourceIngredient } from './source';

export type Level = 'category' | 'type' | 'product';
const rank: Record<Level, number> = { category: 0, type: 1, product: 2 };

export interface Placement {
  level: Level;
  parentId?: string;
  /** The source parent when it was skipped. */
  droppedParentId?: string;
}

export function place(list: readonly SourceIngredient[]): Map<string, Placement> {
  const byId = new Map(list.map((i) => [i._id, i]));
  const hasChildren = new Set(list.flatMap((i) => (i._parent_id ? [i._parent_id] : [])));
  const levelOf = (i: SourceIngredient): Level =>
    !hasChildren.has(i._id) ? 'product' : i._parent_id === null ? 'category' : 'type';
  const out = new Map<string, Placement>();
  for (const item of list) {
    const level = levelOf(item);
    let parent = item._parent_id === null ? undefined : byId.get(item._parent_id);
    if (item._parent_id !== null && !parent) {
      throw new Error(`${item._id}: parent ${item._parent_id} does not exist`);
    }
    const source = parent;
    while (parent && rank[level] <= rank[levelOf(parent)]) {
      parent = parent._parent_id === null ? undefined : byId.get(parent._parent_id);
    }
    out.set(item._id, {
      level,
      ...(parent ? { parentId: parent._id } : {}),
      ...(source && source !== parent ? { droppedParentId: source._id } : {}),
    });
  }
  return out;
}
