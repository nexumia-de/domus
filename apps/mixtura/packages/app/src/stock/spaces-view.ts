// What the Stock screen shows about spaces, derived from the records of every
// space: the names of the ticked spaces that have an ingredient present (row
// line) and one block per ticked space (detail sheet). Pure.

import type { Space, Stock } from '../store';
import type { RecordsBySpace } from './combine';

/** Where an ingredient stands in one space. */
export type SpaceState = 'in' | 'out' | 'untracked';

export interface SpaceBlock {
  spaceId: string;
  name: string;
  state: SpaceState;
  /** The space's own live record, if any. */
  record: Stock | undefined;
}

/**
 * For every ingredient that is present in a ticked space: the names of those spaces, in the order
 * of `ticked`. Empty when fewer than two spaces count, because one space needs no name on a row.
 */
export function presentAt(
  bySpace: RecordsBySpace,
  ticked: readonly string[],
  spaces: readonly Space[],
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (ticked.length < 2) return out;
  const names = new Map(spaces.map((p) => [p.id, p.name]));
  for (const spaceId of ticked) {
    const name = names.get(spaceId);
    if (name === undefined) continue;
    for (const [id, record] of bySpace.get(spaceId) ?? []) {
      if ('deleted' in record || !record.present) continue;
      out.set(id, [...(out.get(id) ?? []), name]);
    }
  }
  return out;
}

/** One block per ticked space for an ingredient, in the order of `ticked`. */
export function spaceBlocks(
  bySpace: RecordsBySpace,
  ticked: readonly string[],
  spaces: readonly Space[],
  id: string,
): SpaceBlock[] {
  return ticked.flatMap((spaceId) => {
    const space = spaces.find((p) => p.id === spaceId);
    if (!space) return [];
    const found = bySpace.get(spaceId)?.get(id);
    const record = found && !('deleted' in found) ? found : undefined;
    const state: SpaceState = !record ? 'untracked' : record.present ? 'in' : 'out';
    return [{ spaceId, name: space.name, state, record }];
  });
}
