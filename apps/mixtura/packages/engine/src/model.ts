// The general model: amounts and units, the ingredient tree, prepared
// ingredients' specs, substitution, template slots, specs, stock and shelf
// life. Nothing here knows dilution or ABV rules. Everything but amounts/
// and exchange/ is re-exported from materia, the code shared with Culina
// (docs/decisions/shared-model.md, docs/shared-model.md); the type lists are
// explicit because materia also exports the generic types whose drink shapes
// drink.ts exports under the same names.
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
  descendants,
  distance,
  getIngredient,
  isA,
  resolveCost,
  sameClass,
  substitutesFor,
  swapCandidates,
} from '@nexumia-de/materia';
export type {
  Cost,
  Found,
  Id,
  Level,
  Missing,
  PreparedError,
  PreparedErrorCode,
  PreparedIngredient,
  PreparedLine,
  PreparedSpec,
  Quantity,
  Resolved,
  Source,
  SpecLookup,
  Substitutes,
  SubstitutionClass,
  SwapCandidates,
  SwapGroup,
  SwapGroupKind,
  SwapOptions,
  TreeError,
  TreeErrorCode,
  UnitVolume,
} from '@nexumia-de/materia';

export { lineRole } from '@nexumia-de/materia';
export type {
  Chosen,
  Range,
  RatioStatus,
  SlotRatio,
  TemplateEvidence,
  Unassigned,
  UnassignedReason,
  UnmeasuredReason,
} from '@nexumia-de/materia';

export {
  buildStockIndex,
  makeableSpecs,
  missingOne,
  pairRanking,
  unlockRanking,
} from '@nexumia-de/materia';
export type {
  LineResult,
  MakeableReport,
  MakeableStatus,
  MissingOne,
  NeedsMore,
  PairCandidate,
  PairOptions,
  PairResult,
  SatisfiedBy,
  SpecResult,
  SpecStatus,
  StockEntry,
  StockIndex,
  StockLine,
  StockMode,
  StockOptions,
  StockSpec,
  UnlockCandidate,
  UnlockResult,
  UnsatisfiedReason,
} from '@nexumia-de/materia';

export { buildFamily, findFamilyCycles, summariseRiff } from '@nexumia-de/materia';
export type { Family, FamilySpec, LineField } from '@nexumia-de/materia';

export {
  addDays,
  dayNumber,
  daysBetween,
  expiry,
  limitingShelfLife,
  USE_SOON_DAYS,
} from '@nexumia-de/materia';
export type {
  Expiry,
  ExpiryInput,
  ExpiryReason,
  ExpiryStatus,
  LimitingShelfLife,
} from '@nexumia-de/materia';

export * from './exchange/index';
