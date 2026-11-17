// The general model: amounts and units, the ingredient tree with roles and
// inherited properties, prepared ingredients, substitution, and matching a
// spec to templates by slots. Nothing here knows dilution or ABV rules; this
// is the part that can move to shared code (docs/decisions/two-apps-one-engine.md).
export {
  convert,
  displayUnit,
  formatAmount,
  formatAmountDetailed,
  fromBase,
  isEstimatedUnit,
  parseAmount,
  scale,
  toBase,
  toGrams,
  toMl,
  UNITS,
  unitValue,
} from './amounts/index';
export type * from './amounts/index';

export {
  ancestors,
  buildTree,
  computePrepared,
  descendants,
  distance,
  getIngredient,
  INHERITED,
  isA,
  resolveAll,
  resolveCost,
  resolveProperty,
  sameClass,
  substitutesFor,
  swapCandidates,
} from './ingredients/index';
export type * from './ingredients/index';

export { assignSlots, lineMl, lineRole, matchSpec, variantSuggestions } from './templates/index';
export type * from './templates/index';

export { buildStockIndex, makeableSpecs, missingOne, unlockRanking } from './stock/index';
export type * from './stock/index';

export { buildFamily, diffSpecs, findFamilyCycles, summariseRiff } from './specs/index';
export type * from './specs/index';

export {
  addDays,
  dayNumber,
  daysBetween,
  expiry,
  limitingShelfLife,
  USE_SOON_DAYS,
} from './shelf/index';
export type * from './shelf/index';
