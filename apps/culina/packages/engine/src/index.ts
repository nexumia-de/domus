// The engine's only public entry. The general model comes from materia
// through model.ts; Culina's kitchen rules are added by their own issues.
export * from './model';

export { convert, toGrams } from './amounts/convert';
export { displayStep, roundMass } from './amounts/round';
export { UNIT_IDS, isUnitId, unitFactor, unitKind } from './amounts/units';
export type {
  Amount,
  ConvertError,
  ConvertErrorCode,
  ConvertResult,
  GramsResult,
  IngredientFacts,
  RoundResult,
  UnitId,
  UnitKind,
} from './amounts/types';

export { DEFAULT_SALT_ROLES, cautionsFor } from './scale/cautions';
export { scaleByFactor, scaleFromLine, scaleToTotal } from './scale/scale';
export type {
  Caution,
  FactsById,
  PercentAmount,
  ScalableLine,
  ScaleError,
  ScaleErrorCode,
  ScaleOptions,
  ScaleResult,
  UnscaledLine,
} from './scale/types';

export { fromBakersPercent } from './bakers/formula';
export { hydration } from './bakers/hydration';
export { bakersPercent } from './bakers/percent';
export type {
  BakersError,
  BakersErrorCode,
  BakersLine,
  BakersOptions,
  BakersPercentResult,
  Composition,
  FormulaLine,
  FormulaResult,
  FormulaTarget,
  HydrationLine,
  HydrationOptions,
  HydrationResult,
} from './bakers/types';

/** The engine's name; the app shows it until it has real screens. */
export const engineName = (): string => 'culina-engine';
