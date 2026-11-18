// Flour and water of an expansion, in the shape `hydration` takes as the
// `composition` of a preferment line.
import type { RawIngredient } from './types';

/** Options of `flourAndWater`; the defaults are those of `hydration`. */
export interface CompositionOptions {
  /** Role counted as flour; default `flour`. */
  baseRole?: string;
  /** Roles counted as water; default `['water']`. */
  waterRoles?: readonly string[];
}

/**
 * Flour and water inside an expansion: the summed grams of the raw
 * ingredients whose role is the base role and of those whose role is a
 * water role. Nothing is derived from what an ingredient contains.
 *
 * @param raw - The `raw` list of `expandComponent`.
 * @param options - `baseRole` (default `flour`) and `waterRoles` (default `['water']`).
 * @returns `flourG` and `waterG`, usable as `composition` in `hydration`.
 */
export function flourAndWater(
  raw: readonly RawIngredient[],
  options: CompositionOptions = {},
): { flourG: number; waterG: number } {
  const baseRole = options.baseRole ?? 'flour';
  const waterRoles = options.waterRoles ?? ['water'];
  let flourG = 0;
  let waterG = 0;
  for (const item of raw) {
    if (item.role === baseRole) flourG += item.g;
    else if (item.role !== undefined && waterRoles.includes(item.role)) waterG += item.g;
  }
  return { flourG, waterG };
}
