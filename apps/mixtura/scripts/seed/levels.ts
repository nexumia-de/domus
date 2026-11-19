// Level and parent of every ingredient. The source tree is kept as it is,
// whatever its depth (up to five levels): the parent is always the source
// parent. The level only describes the position: a root with children is a
// `category`, any other inner node a `type`, a node without children a
// `product` (docs/ingredients.md, docs/seed-data.md).
import type { SourceIngredient } from './source';

export type Level = 'category' | 'type' | 'product';

export interface Placement {
  level: Level;
  parentId?: string;
}

export function place(list: readonly SourceIngredient[]): Map<string, Placement> {
  const ids = new Set(list.map((i) => i._id));
  const hasChildren = new Set(list.flatMap((i) => (i._parent_id ? [i._parent_id] : [])));
  const out = new Map<string, Placement>();
  for (const item of list) {
    if (item._parent_id !== null && !ids.has(item._parent_id)) {
      throw new Error(`${item._id}: parent ${item._parent_id} does not exist`);
    }
    const level: Level = !hasChildren.has(item._id)
      ? 'product'
      : item._parent_id === null
        ? 'category'
        : 'type';
    out.set(item._id, {
      level,
      ...(item._parent_id !== null ? { parentId: item._parent_id } : {}),
    });
  }
  return out;
}
