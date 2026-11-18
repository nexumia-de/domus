// The general model, shared with Mixtura: re-exported from materia
// (docs/decisions/shared-model.md). Only the functions that need no kitchen
// shape are listed here; the generic ones (`inheritedValue`,
// `resolvePrepared`, `fillSlots`, `matchTemplates`, `findVariants`,
// `diffVersions`) are called by Culina's own modules with its lists, and the
// types get their kitchen shapes there. Nothing here knows mass, yields or
// baker's percentages.
export {
  addDays,
  ancestors,
  buildFamily,
  buildStockIndex,
  buildTree,
  dayNumber,
  daysBetween,
  descendants,
  diffVersions,
  distance,
  expiry,
  findFamilyCycles,
  getIngredient,
  isA,
  limitingShelfLife,
  makeableSpecs,
  missingOne,
  sameClass,
  substitutesFor,
  swapCandidates,
  unlockRanking,
  USE_SOON_DAYS,
} from '@nexumia-de/materia';
export type { DiffDomain, VersionLine, VersionSpec } from '@nexumia-de/materia';
