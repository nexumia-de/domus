// Points records at other ingredient ids: used when a file's ingredient is the same thing as one
// the notebook already has under another id.
import type { ExportRecord, FullRecordSets } from './types';

const swapRef = (ref: unknown, map: ReadonlyMap<string, string>): unknown => {
  const r = ref as { kind?: unknown; id?: unknown };
  if (r?.kind !== 'ingredient' || typeof r.id !== 'string') return ref;
  const to = map.get(r.id);
  return to === undefined ? ref : { ...r, id: to };
};

const swapId = (id: unknown, map: ReadonlyMap<string, string>): unknown =>
  typeof id === 'string' && map.has(id) ? map.get(id) : id;

/**
 * A copy of `records` in which every reference to an ingredient id in `map` (line and slot
 * refs, `parentId`, both ends of an affinity) names the mapped id, and the mapped
 * ingredients themselves are left out: the notebook's own record stands for them.
 */
export function remapIngredients(
  records: FullRecordSets,
  map: ReadonlyMap<string, string>,
): FullRecordSets {
  const copy = structuredClone(records);
  copy.ingredients = copy.ingredients
    .filter((r) => !map.has(r.id))
    .map((r) => (r.parentId === undefined ? r : { ...r, parentId: swapId(r.parentId, map) }));
  for (const r of copy.components) {
    r.lines = (r.lines as { ref: unknown }[]).map((l) => ({ ...l, ref: swapRef(l.ref, map) }));
  }
  for (const r of copy.dishes) {
    r.slots = (r.slots as { ref: unknown }[]).map((s) => ({ ...s, ref: swapRef(s.ref, map) }));
  }
  for (const r of copy.affinities) {
    r.a = swapId(r.a, map);
    r.b = swapId(r.b, map);
  }
  return copy as { [K in keyof FullRecordSets]: ExportRecord[] };
}
