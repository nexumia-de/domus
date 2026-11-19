// The newest version of a drink in the browse model.

import { isUserId } from '../../store';
import type { BrowseModel } from '../browse/model';
import type { SpecData } from '../browse/types';

/** The newest version of a drink, retired ones included, and where it comes from. */
export function newestOfLineage(
  model: BrowseModel,
  lineageId: string,
): { spec: SpecData; origin: 'seed' | 'user' } | undefined {
  let best: SpecData | undefined;
  for (const spec of model.specById.values()) {
    if (spec.lineageId === lineageId && (!best || spec.version > best.version)) best = spec;
  }
  return best && { spec: best, origin: isUserId(best.id) ? 'user' : 'seed' };
}
