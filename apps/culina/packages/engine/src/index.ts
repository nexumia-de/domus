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

export { checkRatio } from './ratios/check';
export { templateAncestors, templateChildren, templateSiblings } from './ratios/family';
export { templatePercent } from './ratios/percent';
export { resolveTemplate } from './ratios/resolve';
export { scaleFromAnchor } from './ratios/scale';
export { SEED_TEMPLATES } from './ratios/seed';
export type {
  AncestorsResult,
  CheckResult,
  EffectivePart,
  EffectiveTemplate,
  PartRange,
  PercentResult,
  RangePosition,
  RatioError,
  RatioErrorCode,
  RatioTemplate,
  ResolveResult,
  RoleCheck,
  ScaleAnchorResult,
  TemplateChange,
  TemplateError,
  TemplateErrorCode,
  TemplatePart,
} from './ratios/types';

export { saltFor } from './salt/percent';
export type { SaltBasis, SaltErrorCode, SaltInput, SaltResult } from './salt/percent';

export { flourAndWater } from './components/composition';
export type { CompositionOptions } from './components/composition';
export { expandComponent } from './components/expand';
export { convertComponentLines } from './components/convert';
export type { ConvertLinesResult, LineEntry } from './components/convert';
export { componentLineGrams } from './components/lines';
export { portionsFromYield, portionWeight } from './components/portions';
export { componentYield } from './components/yield';
export type {
  Component,
  ComponentError,
  ComponentErrorCode,
  ComponentLine,
  ComponentRef,
  ExpandOptions,
  ExpandResult,
  FactsByIngredient,
  FoodState,
  LineGrams,
  LinesResult,
  PortionsResult,
  PortionWeightResult,
  RawIngredient,
  UnmeasuredLine,
  YieldFigures,
  YieldResult,
} from './components/types';

export { toEdible, toPurchased, yieldFor } from './yields/edible';
export type { EdibleResult, IngredientYield, YieldError, YieldLookup } from './yields/edible';

export { validateModel } from './validate/model';
export type {
  EntityKind,
  Finding,
  FindingCode,
  ModelAffinity,
  ModelComponent,
  ModelDish,
  ModelIngredient,
  ModelInput,
  ModelStock,
  ModelTasting,
  ModelVersion,
  ValidationResult,
} from './validate/types';

export {
  familyHeads,
  variationCycles,
  variationParent,
  variationsOf,
  versionFamily,
  versionNumber,
} from './versions/chain';
export { diffComponentVersions, diffDishVersions } from './versions/diff';
export type {
  DiffComponent,
  DiffDish,
  DiffLine,
  DiffResult,
  FamilyResult,
  FamilyVersions,
  FieldChange,
  LineChange,
  LineField,
  Variation,
  VariationParent,
  VersionChange,
  VersionDiff,
  VersionError,
  VersionErrorCode,
  VersionField,
  VersionMeta,
  Versioned,
} from './versions/types';

/** The engine's name; the app shows it until it has real screens. */
export const engineName = (): string => 'culina-engine';

export {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  buildExport,
  exportFileName,
  serializeExport,
} from './exchange/build';
export { EXPORT_MIGRATIONS, parseExport } from './exchange/parse';
export type { ParseOptions } from './exchange/parse';
export { IMMUTABLE_KINDS, conflictKey, mergeWrites, planMerge, sameRecord } from './exchange/merge';
export type { Choice, Conflict, MergePlan } from './exchange/merge';
export { remapIngredients } from './exchange/remap';
export { matchIngredients, nameWords, normaliseName } from './exchange/match';
export type { Candidate, NameMatch } from './exchange/match';
export { EXPORT_KINDS } from './exchange/types';
export type {
  ExportContent,
  ExportEnvelope,
  ExportError,
  ExportErrorCode,
  ExportKind,
  ExportMigration,
  ExportRecord,
  FullRecordSets,
  ParseResult,
  RecordSets,
  RecordValidator,
  RecordValidators,
} from './exchange/types';

export { parseCooklang, ingredientUses } from './cooklang/parse';
export { parseInline, parseQuantity, plainText } from './cooklang/inline';
export { componentToCooklang, fileStem } from './cooklang/serialize';
export type {
  CooklangComponent,
  Loss,
  SerializeContext,
  SerializeResult,
} from './cooklang/serialize';
export { availableModes, givenAmount, quantityText, resolveAmount } from './cooklang/amount';
export type { AmountErrorCode, AmountMode, AmountResult } from './cooklang/amount';
export { importComponent } from './cooklang/import';
export type { ImportErrorCode, ImportOptions, ImportResult, LineDecision } from './cooklang/import';
export { unitFromWord } from './cooklang/units';
export type {
  Block,
  CookIngredient,
  CooklangDocument,
  IngredientUse,
  MetaValue,
  Segment,
} from './cooklang/types';
